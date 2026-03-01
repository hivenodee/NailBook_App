import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendClientConfirmation, sendProviderNewBooking, formatDateTime, type BookingEmailData } from "@/lib/email";
import { sendBookingConfirmationSms } from "@/lib/sms";
import { invalidateAvailability } from "@/lib/cache";
import { notifyWaitlistForDate } from "@/lib/waitlist";
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

      // Handle TIP payments — don't change appointment status
      if (paymentType === "TIP") {
        // Guard against duplicate tips (race condition)
        const existingTip = await prisma.payment.findFirst({
          where: { appointmentId, type: "TIP", status: "COMPLETED" },
        });
        if (existingTip) {
          // Record the event but skip creating a duplicate payment
          await prisma.appointmentEvent.create({
            data: {
              appointmentId,
              type: "tip_duplicate_skipped",
              actorType: "system",
              metadata: { stripeEventId: event.id },
            },
          });
          break;
        }

        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              providerId,
              appointmentId,
              amountInCents: session.amount_total || 0,
              type: "TIP",
              status: "COMPLETED",
              method: "CARD",
              stripePaymentIntentId: session.payment_intent as string,
            },
          });

          await tx.appointmentEvent.create({
            data: {
              appointmentId,
              type: "tip_received",
              actorType: "system",
              metadata: {
                stripeEventId: event.id,
                amount: session.amount_total,
              },
            },
          });
        });
        break;
      }

      // Handle BALANCE payments separately — don't change appointment status
      if (paymentType === "BALANCE") {
        await prisma.$transaction(async (tx) => {
          await tx.payment.create({
            data: {
              providerId,
              appointmentId,
              amountInCents: session.amount_total || 0,
              type: "BALANCE",
              status: "COMPLETED",
              method: "CARD",
              stripePaymentIntentId: session.payment_intent as string,
            },
          });

          await tx.appointmentEvent.create({
            data: {
              appointmentId,
              type: "balance_payment_received",
              actorType: "system",
              metadata: {
                stripeEventId: event.id,
                amount: session.amount_total,
              },
            },
          });
        });
        break;
      }

      // Guard: only confirm PENDING_PAYMENT appointments (don't revert COMPLETED/CANCELLED)
      const currentAppt = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        select: { status: true },
      });
      if (currentAppt && currentAppt.status !== "PENDING_PAYMENT") {
        // Still record the payment but don't change status
        await prisma.$transaction(async (tx) => {
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
          await tx.appointmentEvent.create({
            data: {
              appointmentId,
              type: "payment_received",
              actorType: "system",
              metadata: {
                stripeEventId: event.id,
                amount: session.amount_total,
                note: `Payment recorded but status not changed (was ${currentAppt.status})`,
              },
            },
          });
        });
        break;
      }

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
          provider: { select: { businessName: true, slug: true, timezone: true, locationAddress: true, cancellationHours: true, arrivalGraceMinutes: true, user: { select: { email: true } } } },
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
          slug: appointment.provider.slug,
          appointmentId: appointment.id,
          manageToken: appointment.manageToken ?? undefined,
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
          const dateStr = expiredAppt.startTime.toISOString().split("T")[0];
          await invalidateAvailability(expiredAppt.providerId, dateStr);

          // Notify waitlist that the slot is free again
          notifyWaitlistForDate(
            expiredAppt.providerId,
            dateStr,
            expiredAppt.startTime.toISOString(),
          ).catch((e) =>
            console.error("[waitlist] Failed to notify:", e),
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
