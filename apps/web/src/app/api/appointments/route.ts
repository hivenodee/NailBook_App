import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { createBookingSchema } from "@nailbook/shared";
import { stripe } from "@/lib/stripe";

export const dynamic = "force-dynamic";

// GET /api/appointments — list appointments for current user
export async function GET(request: NextRequest) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);

  const { searchParams } = new URL(request.url);
  const status = searchParams.get("status");

  // If provider, show their appointments; if client, show their bookings
  const where = user.provider
    ? { providerId: user.provider.id, ...(status ? { status: status as never } : {}) }
    : { clientId: user.id, ...(status ? { status: status as never } : {}) };

  const appointments = await prisma.appointment.findMany({
    where,
    include: {
      service: true,
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      provider: {
        select: { businessName: true, slug: true },
      },
    },
    orderBy: { startTime: "asc" },
  });

  return success(appointments);
}

// POST /api/appointments — create a new booking
export async function POST(request: NextRequest) {
  const result = await parseBody(request, createBookingSchema);
  if (result.error) return result.error;

  const { serviceId, startTime, clientName, clientEmail, clientPhone, paymentMethod, inspirationUrl } =
    result.data;

  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    include: { provider: true },
  });
  if (!service) return error("Service not found", 404);

  const start = new Date(startTime);
  const end = new Date(start.getTime() + service.durationMinutes * 60 * 1000);

  // Check for overlapping confirmed appointments
  const overlap = await prisma.appointment.findFirst({
    where: {
      providerId: service.providerId,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startTime: { lt: end },
      endTime: { gt: start },
    },
  });
  if (overlap) return error("Time slot is no longer available", 409);

  // Calculate deposit
  let depositInCents = 0;
  if (service.depositType === "FLAT") {
    depositInCents = service.depositValue;
  } else if (service.depositType === "PERCENT") {
    depositInCents = Math.round(
      (service.priceInCents * service.depositValue) / 100
    );
  }

  // Determine client ID (authenticated or guest)
  let clientId: string | undefined;
  try {
    const { userId } = await auth();
    if (userId) {
      const user = await prisma.user.findUnique({ where: { clerkId: userId } });
      clientId = user?.id;
    }
  } catch {
    // Not authenticated — that's fine for public bookings
  }

  // For guest bookings, find or create a user by email
  if (!clientId && clientEmail) {
    const guestUser = await prisma.user.upsert({
      where: { email: clientEmail },
      update: {},
      create: {
        clerkId: `guest_${Date.now()}`,
        email: clientEmail,
        firstName: clientName || undefined,
        role: "CLIENT",
      },
    });
    clientId = guestUser.id;
  }

  if (!clientId) return error("Email is required for booking", 400);

  // Create appointment
  const appointment = await prisma.$transaction(async (tx) => {
    const appt = await tx.appointment.create({
      data: {
        providerId: service.providerId,
        clientId,
        serviceId,
        status: paymentMethod === "CASH" ? "CONFIRMED" : "PENDING_PAYMENT",
        startTime: start,
        endTime: end,
        totalInCents: service.priceInCents,
        depositInCents,
        clientName,
        clientEmail,
        clientPhone,
        inspirationUrl,
        isNewClient: true,
      },
    });

    // Write event
    await tx.appointmentEvent.create({
      data: {
        appointmentId: appt.id,
        type: "created",
        actorType: clientId ? "client" : "system",
        actorId: clientId,
      },
    });

    return appt;
  });

  // If cash, no Stripe needed
  if (paymentMethod === "CASH") {
    return success(appointment, 201);
  }

  // Create Stripe checkout session for deposit or full payment
  const amountToCharge = depositInCents > 0 ? depositInCents : service.priceInCents;

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: `${service.name}${depositInCents > 0 ? " (Deposit)" : ""}`,
            description: `Booking with ${service.provider.businessName}`,
          },
          unit_amount: amountToCharge,
        },
        quantity: 1,
      },
    ],
    metadata: {
      appointmentId: appointment.id,
      providerId: service.providerId,
      paymentType: depositInCents > 0 ? "DEPOSIT" : "FULL",
    },
    success_url: `${process.env.NEXT_PUBLIC_APP_URL}/${service.provider.slug}/confirmation?appointment=${appointment.id}`,
    cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/${service.provider.slug}/book?service=${serviceId}`,
  });

  // Store session ID on appointment
  await prisma.appointment.update({
    where: { id: appointment.id },
    data: { stripeSessionId: session.id },
  });

  return success({ appointment, checkoutUrl: session.url }, 201);
}
