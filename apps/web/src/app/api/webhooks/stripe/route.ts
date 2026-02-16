import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendClientConfirmation, sendProviderNewBooking, formatDateTime, type BookingEmailData } from "@/lib/email";
import { sendBookingConfirmationSms } from "@/lib/sms";
import { invalidateAvailability } from "@/lib/cache";
import { scheduleReminders } from "@/lib/schedule-jobs";
import type Stripe from "stripe";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  const body = await request.text();
  const signature = request.headers.get("stripe-signature");

  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(
      body,
      signature,
      process.env.STRIPE_WEBHOOK_SECRET!
    );
  } catch {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Idempotency: check if we've already processed this event
  const existingEvent = await prisma.appointmentEvent.findFirst({
    where: { metadata: { path: ["stripeEventId"], equals: event.id } },
  });
  if (existingEvent) {
    return NextResponse.json({ received: true });
  }

  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { appointmentId, providerId, paymentType } = session.metadata || {};

      if (!appointmentId || !providerId) break;

      await prisma.$transaction(async (tx) => {
        // Update appointment status
        await tx.appointment.update({
          where: { id: appointmentId },
          data: {
            status: "CONFIRMED",
            stripePaymentIntentId: session.payment_intent as string,
          },
        });

        // Create payment record
        await tx.payment.create({
          data: {
            providerId,
            appointmentId,
            amountInCents: session.amount_total || 0,
            type: paymentType === "DEPOSIT" ? "DEPOSIT" : "FULL",
            status: "COMPLETED",
            method: "CARD",
            stripePaymentIntentId: session.payment_intent as string,
          },
        });

        // Write event
        await tx.appointmentEvent.create({
          data: {
            appointmentId,
            type: "payment_received",
            actorType: "system",
            metadata: {
              stripeEventId: event.id,
              amount: session.amount_total,
            },
          },
        });
      });

      // Send confirmation emails (client + provider)
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: {
          service: true,
          provider: { include: { user: { select: { email: true } } } },
        },
      });

      if (appointment) {
        // Invalidate availability cache for the confirmed appointment's date
        await invalidateAvailability(
          appointment.providerId,
          appointment.startTime.toISOString().split("T")[0],
        );

        const emailData: BookingEmailData = {
          providerName: appointment.provider.businessName,
          serviceName: appointment.service.name,
          durationMinutes: appointment.service.durationMinutes,
          startTime: appointment.startTime,
          endTime: appointment.endTime,
          totalInCents: appointment.totalInCents,
          depositInCents: appointment.depositInCents,
          paymentType: paymentType === "DEPOSIT" ? "DEPOSIT" : "FULL",
          locationAddress: appointment.provider.locationAddress,
          cancellationHours: appointment.provider.cancellationHours,
          arrivalGraceMinutes: appointment.provider.arrivalGraceMinutes,
          clientName: appointment.clientName,
          clientEmail: appointment.clientEmail,
          timezone: appointment.provider.timezone,
        };
        try {
          await Promise.all([
            sendClientConfirmation(emailData, appointment.providerId),
            sendProviderNewBooking(appointment.provider.user.email, emailData, appointment.providerId),
          ]);
        } catch (e) {
          console.error("[email] Failed to send booking confirmation emails:", e);
        }
        // Send booking confirmation SMS
        if (appointment.clientPhone) {
          const smsVars: Record<string, string> = {
            providerName: appointment.provider.businessName,
            serviceName: appointment.service.name,
            clientName: appointment.clientName || "Client",
            clientEmail: appointment.clientEmail || "",
            dateTime: formatDateTime(appointment.startTime, appointment.provider.timezone),
            duration: String(appointment.service.durationMinutes),
            total: `$${(appointment.totalInCents / 100).toFixed(2)}`,
            deposit: `$${(appointment.depositInCents / 100).toFixed(2)}`,
            paymentLine: paymentType === "DEPOSIT"
              ? `Deposit paid: $${(appointment.depositInCents / 100).toFixed(2)} — Remaining: $${((appointment.totalInCents - appointment.depositInCents) / 100).toFixed(2)}`
              : `Paid: $${(appointment.totalInCents / 100).toFixed(2)}`,
            location: appointment.provider.locationAddress || "",
            cancellationHours: String(appointment.provider.cancellationHours),
            arrivalGraceMinutes: String(appointment.provider.arrivalGraceMinutes),
            calendarUrl: "",
          };
          sendBookingConfirmationSms(appointment.clientPhone, smsVars, appointment.providerId).catch((e) =>
            console.error("[sms] Failed to send booking confirmation SMS:", e)
          );
        }
        // Schedule reminder jobs (24h + 2h before appointment)
        scheduleReminders(appointment.id, appointment.startTime).catch((e) =>
          console.error("[jobs] Failed to schedule reminders:", e)
        );
      }
      break;
    }

    case "checkout.session.expired": {
      const session = event.data.object as Stripe.Checkout.Session;
      const { appointmentId } = session.metadata || {};

      if (appointmentId) {
        const expiredAppt = await prisma.appointment.findUnique({
          where: { id: appointmentId },
          select: { providerId: true, startTime: true },
        });

        await prisma.appointmentEvent.create({
          data: {
            appointmentId,
            type: "checkout_expired",
            actorType: "system",
            metadata: { stripeEventId: event.id },
          },
        });

        // Invalidate cache so the slot becomes available again
        if (expiredAppt) {
          await invalidateAvailability(
            expiredAppt.providerId,
            expiredAppt.startTime.toISOString().split("T")[0],
          );
        }
      }
      break;
    }

    case "charge.refunded": {
      const charge = event.data.object as Stripe.Charge;
      const paymentIntentId = charge.payment_intent as string;

      const payment = await prisma.payment.findFirst({
        where: { stripePaymentIntentId: paymentIntentId },
      });

      if (payment) {
        await prisma.$transaction(async (tx) => {
          await tx.payment.update({
            where: { id: payment.id },
            data: { status: "REFUNDED" },
          });

          await tx.appointmentEvent.create({
            data: {
              appointmentId: payment.appointmentId,
              type: "refund_processed",
              actorType: "system",
              metadata: { stripeEventId: event.id },
            },
          });
        });
      }
      break;
    }
  }

  return NextResponse.json({ received: true });
}
