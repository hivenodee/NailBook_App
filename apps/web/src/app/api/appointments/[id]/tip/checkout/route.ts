import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { stripe } from "@/lib/stripe";
import { strictRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/appointments/:id/tip/checkout — create Stripe checkout for tip
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const limited = await strictRateLimit(request);
  if (limited) return limited;

  const { id } = await params;
  const body = await request.json();
  const { amountInCents } = body as { amountInCents: number };

  if (!amountInCents || amountInCents < 100 || amountInCents > 10000) {
    return error("Tip amount must be between $1.00 and $100.00", 400);
  }

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      provider: { select: { businessName: true, slug: true, stripeAccountId: true } },
    },
  });

  if (!appointment) return error("Appointment not found", 404);
  if (appointment.status !== "COMPLETED") {
    return error("Tips can only be left on completed appointments", 400);
  }

  // Check if tip already exists
  const existingTip = await prisma.payment.findFirst({
    where: { appointmentId: id, type: "TIP", status: "COMPLETED" },
  });
  if (existingTip) {
    return error("A tip has already been received for this appointment", 400);
  }

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `Tip for ${appointment.provider.businessName}`,
            description: `Thank you for your ${appointment.service.name}`,
          },
          unit_amount: amountInCents,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: id,
      providerId: appointment.providerId,
      paymentType: "TIP",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${appointment.provider.slug}/tip/${id}?success=true`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${appointment.provider.slug}/tip/${id}`,
  });

  return success({ checkoutUrl: session.url });
}
