import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/db";
import { stripe } from "@/lib/stripe";
import { getBalanceInfo } from "@/lib/balance";
import { strictRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// POST /api/appointments/:id/balance/checkout — public, no auth
export async function POST(_request: NextRequest, { params }: Params) {
  const limited = await strictRateLimit(_request);
  if (limited) return limited;

  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    select: {
      id: true,
      status: true,
      providerId: true,
      service: { select: { name: true } },
      provider: { select: { slug: true, stripeAccountId: true } },
    },
  });

  if (!appointment) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!["CONFIRMED", "COMPLETED"].includes(appointment.status)) {
    return NextResponse.json(
      { error: "Appointment must be confirmed or completed" },
      { status: 400 },
    );
  }

  const balance = await getBalanceInfo(id);
  if (!balance || balance.remainingInCents <= 0) {
    return NextResponse.json(
      { error: "No remaining balance" },
      { status: 400 },
    );
  }

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

  return NextResponse.json({ data: { checkoutUrl: session.url } });
}
