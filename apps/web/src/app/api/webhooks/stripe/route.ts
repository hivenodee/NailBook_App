import { NextRequest, NextResponse } from "next/server";
import { stripe } from "@/lib/stripe";
import { prisma } from "@/lib/db";
import { sendBookingConfirmation } from "@/lib/email";
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

      // Send confirmation email
      const appointment = await prisma.appointment.findUnique({
        where: { id: appointmentId },
        include: { service: true, provider: true },
      });

      if (appointment?.clientEmail) {
        const depositStr =
          appointment.depositInCents > 0
            ? `$${(appointment.depositInCents / 100).toFixed(2)}`
            : null;

        await sendBookingConfirmation(
          appointment.clientEmail,
          appointment.provider.businessName,
          appointment.service.name,
          appointment.startTime.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            hour: "numeric",
            minute: "2-digit",
          }),
          depositStr
        );
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
