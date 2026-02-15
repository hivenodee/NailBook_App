import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { invalidateAvailability } from "@/lib/cache";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/appointments/:id
export async function GET(_request: NextRequest, { params }: Params) {
  const { id } = await params;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      addOns: { select: { id: true, name: true, priceInCents: true, durationMinutes: true } },
      provider: { select: { businessName: true, slug: true } },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
    },
  });

  if (!appointment) return error("Appointment not found", 404);
  return success(appointment);
}

// PATCH /api/appointments/:id — update status (accept, cancel, complete, reschedule)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const { id } = await params;
  const body = await request.json();
  const { action, startTime } = body as {
    action: "accept" | "cancel" | "complete" | "reschedule" | "no_show";
    startTime?: string;
  };

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: { service: true },
  });
  if (!appointment) return error("Appointment not found", 404);

  // Verify ownership
  const isProvider = user.provider?.id === appointment.providerId;
  const isClient = user.id === appointment.clientId;
  if (!isProvider && !isClient) return error("Forbidden", 403);

  const updated = await prisma.$transaction(async (tx) => {
    let newStatus = appointment.status;
    let eventType: string = action;

    switch (action) {
      case "accept":
        if (!isProvider) return null;
        newStatus = "CONFIRMED";
        break;
      case "cancel":
        newStatus = "CANCELLED";
        break;
      case "complete":
        if (!isProvider) return null;
        newStatus = "COMPLETED";
        break;
      case "no_show":
        if (!isProvider) return null;
        newStatus = "NO_SHOW";
        break;
      case "reschedule":
        if (!startTime) return null;
        eventType = "rescheduled";
        break;
    }

    const updateData: Record<string, unknown> = { status: newStatus };
    if (action === "reschedule" && startTime) {
      const start = new Date(startTime);
      const end = new Date(
        start.getTime() + appointment.service.durationMinutes * 60 * 1000
      );
      updateData.startTime = start;
      updateData.endTime = end;
    }

    const appt = await tx.appointment.update({
      where: { id },
      data: updateData,
    });

    await tx.appointmentEvent.create({
      data: {
        appointmentId: id,
        type: eventType,
        actorId: user.id,
        actorType: isProvider ? "provider" : "client",
        metadata: action === "reschedule" ? { newStartTime: startTime } : undefined,
      },
    });

    return appt;
  });

  if (!updated) return error("Invalid action", 400);

  // Invalidate availability cache for the appointment's date
  const datesToInvalidate = [appointment.startTime.toISOString().split("T")[0]];
  if (action === "reschedule" && startTime) {
    datesToInvalidate.push(new Date(startTime).toISOString().split("T")[0]);
  }
  await invalidateAvailability(appointment.providerId, ...datesToInvalidate);

  return success(updated);
}
