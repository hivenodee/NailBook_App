import { NextRequest, NextResponse } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getBalanceInfo } from "@/lib/balance";
import { sendBalanceRequest, formatDateTime } from "@/lib/email";
import { sendBalanceRequestSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/appointments/:id/collect-balance — provider auth
export async function POST(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const body = await request.json();
  const { action } = body as { action: "send-link" | "mark-cash" };

  if (!action || !["send-link", "mark-cash"].includes(action)) {
    return NextResponse.json({ error: "Invalid action" }, { status: 400 });
  }

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user?.provider) {
    return NextResponse.json({ error: "Not a provider" }, { status: 403 });
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: { select: { name: true } },
      provider: { select: { slug: true, businessName: true, stripeAccountId: true, timezone: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (appointment.providerId !== user.provider.id) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const balance = await getBalanceInfo(id);
  if (!balance || balance.remainingInCents <= 0) {
    return NextResponse.json(
      { error: "No remaining balance" },
      { status: 400 },
    );
  }

  if (action === "mark-cash") {
    const payment = await prisma.$transaction(async (tx) => {
      const p = await tx.payment.create({
        data: {
          providerId: appointment.providerId,
          appointmentId: id,
          amountInCents: balance.remainingInCents,
          type: "BALANCE",
          status: "COMPLETED",
          method: "CASH",
        },
      });

      await tx.appointmentEvent.create({
        data: {
          appointmentId: id,
          type: "balance_cash_received",
          actorId: user.id,
          actorType: "provider",
          metadata: { amountInCents: balance.remainingInCents },
        },
      });

      return p;
    });

    return NextResponse.json({ data: { payment } });
  }

  // action === "send-link"
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
  const slug = appointment.provider.slug;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${appointment.service.name} (Remaining Balance)`,
          },
          unit_amount: balance.remainingInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: id,
      providerId: appointment.providerId,
      paymentType: "BALANCE",
    },
    success_url: `${baseUrl}/${slug}/pay/${id}?status=success`,
    cancel_url: `${baseUrl}/${slug}/pay/${id}`,
    ...(appointment.provider.stripeAccountId
      ? {
          payment_intent_data: {
            transfer_data: {
              destination: appointment.provider.stripeAccountId,
            },
          },
        }
      : {}),
  });

  // Log event
  await prisma.appointmentEvent.create({
    data: {
      appointmentId: id,
      type: "balance_link_sent",
      actorId: user.id,
      actorType: "provider",
      metadata: { checkoutUrl: session.url },
    },
  });

  // Send email + SMS in background
  const tz = appointment.provider.timezone;
  const emailData = {
    providerName: appointment.provider.businessName,
    serviceName: appointment.service.name,
    startTime: appointment.startTime,
    totalInCents: appointment.totalInCents,
    depositInCents: appointment.depositInCents,
    remainingInCents: balance.remainingInCents,
    clientName: appointment.clientName,
    clientEmail: appointment.clientEmail,
    timezone: tz,
    paymentUrl: `${baseUrl}/${slug}/pay/${id}`,
  };

  sendBalanceRequest(emailData, appointment.providerId).catch((e) =>
    console.error("[email] Failed to send balance request:", e),
  );

  if (appointment.clientPhone) {
    const smsVars: Record<string, string> = {
      providerName: appointment.provider.businessName,
      serviceName: appointment.service.name,
      clientName: appointment.clientName || "Client",
      clientEmail: appointment.clientEmail || "",
      dateTime: formatDateTime(appointment.startTime, tz),
      total: `$${(appointment.totalInCents / 100).toFixed(2)}`,
      deposit: `$${(appointment.depositInCents / 100).toFixed(2)}`,
      remainingBalance: `$${(balance.remainingInCents / 100).toFixed(2)}`,
      paymentUrl: `${baseUrl}/${slug}/pay/${id}`,
    };
    sendBalanceRequestSms(appointment.clientPhone, smsVars, appointment.providerId).catch((e) =>
      console.error("[sms] Failed to send balance request SMS:", e),
    );
  }

  return NextResponse.json({ data: { checkoutUrl: session.url } });
}
