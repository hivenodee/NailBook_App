import { NextRequest } from "next/server";
import { auth } from "@clerk/nextjs/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { invalidateAvailability } from "@/lib/cache";
import { notifyWaitlistForDate } from "@/lib/waitlist";
import {
  sendCancellationEmail,
  sendProviderCancellation,
  sendCompletionThankYou,
  sendClientConfirmation,
  type CancellationEmailData,
} from "@/lib/email";
import { cancelReminders, scheduleFollowup, scheduleReminders } from "@/lib/schedule-jobs";
import { sendCancellationSms } from "@/lib/sms";

export const dynamic = "force-dynamic";

type Params = { params: Promise<{ id: string }> };

// GET /api/appointments/:id
export async function GET(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      addOns: { select: { id: true, name: true, priceInCents: true, durationMinutes: true } },
      provider: { select: { businessName: true, slug: true, timezone: true, cancellationHours: true } },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      coupon: { select: { code: true, type: true, value: true } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      feedback: { select: { id: true } },
      intakeResponses: { include: { question: { select: { label: true, type: true } } } },
    },
  });

  if (!appointment) return error("Appointment not found", 404);

  // If token provided, verify it for public access (client self-manage flow)
  if (token) {
    if (appointment.manageToken !== token) return error("Invalid token", 403);
    return success(appointment);
  }

  // No token — require Clerk auth and verify the user is the owning provider
  const { userId } = await auth();
  if (!userId) return error("Unauthorized", 401);

  const user = await prisma.user.findUnique({
    where: { clerkId: userId },
    include: { provider: true },
  });
  if (!user) return error("User not found", 404);

  const isProvider = user.provider?.id === appointment.providerId;
  if (!isProvider) return error("Forbidden", 403);

  return success(appointment);
}

// PATCH /api/appointments/:id — update status (accept, cancel, complete, reschedule)
export async function PATCH(request: NextRequest, { params }: Params) {
  const { id } = await params;
  const token = new URL(request.url).searchParams.get("token");
  const body = await request.json();
  const { action, startTime, cancelScope } = body as {
    action: "accept" | "cancel" | "complete" | "reschedule" | "no_show";
    startTime?: string;
    cancelScope?: "single" | "future"; // for recurring appointments
  };

  let isProvider = false;
  let isClient = false;
  let isTokenAuth = false;
  let user: { id: string; provider: { id: string } | null } | null = null;

  const appointment = await prisma.appointment.findUnique({
    where: { id },
    include: {
      service: true,
      provider: { include: { user: { select: { email: true } } } },
    },
  });
  if (!appointment) return error("Appointment not found", 404);

  // Token-based auth for client self-service
  if (token) {
    if (appointment.manageToken !== token) return error("Invalid token", 403);
    isTokenAuth = true;
    isClient = true;
    // Only cancel and reschedule allowed via token
    if (action !== "cancel" && action !== "reschedule") {
      return error("Only cancel and reschedule are available for self-service", 403);
    }
    // Enforce cancellation policy
    const hoursUntil = (appointment.startTime.getTime() - Date.now()) / (1000 * 60 * 60);
    if (hoursUntil < appointment.provider.cancellationHours) {
      return error(`Cannot ${action} within ${appointment.provider.cancellationHours} hours of your appointment`, 403);
    }
  } else {
    const { userId } = await auth();
    if (!userId) return error("Unauthorized", 401);

    user = await prisma.user.findUnique({
      where: { clerkId: userId },
      include: { provider: true },
    });
    if (!user) return error("User not found", 404);

    isProvider = user.provider?.id === appointment.providerId;
    isClient = user.id === appointment.clientId;
    if (!isProvider && !isClient) return error("Forbidden", 403);
  }

  // ─── Validate status transitions ─────────────────────
  const VALID_TRANSITIONS: Record<string, string[]> = {
    accept: ["PENDING_PAYMENT", "CONFIRMED"], // allow accept on CONFIRMED for idempotency
    cancel: ["PENDING_PAYMENT", "CONFIRMED"],
    complete: ["CONFIRMED"],
    no_show: ["CONFIRMED"],
    reschedule: ["CONFIRMED", "PENDING_PAYMENT"],
  };
  const allowedFrom = VALID_TRANSITIONS[action];
  if (allowedFrom && !allowedFrom.includes(appointment.status)) {
    return error(
      `Cannot ${action} an appointment with status ${appointment.status}`,
      409,
    );
  }

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
        actorId: isTokenAuth ? appointment.clientId : user?.id,
        actorType: isProvider ? "provider" : "client",
        metadata: action === "reschedule" ? { newStartTime: startTime } : undefined,
      },
    });

    return appt;
  });

  if (!updated) return error("Invalid action", 400);

  // Handle "cancel all future" for recurring appointments (atomic)
  if (action === "cancel" && cancelScope === "future" && appointment.recurrenceGroupId && appointment.recurrenceIndex !== null) {
    const futureAppts = await prisma.appointment.findMany({
      where: {
        recurrenceGroupId: appointment.recurrenceGroupId,
        recurrenceIndex: { gt: appointment.recurrenceIndex },
        status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      },
      select: { id: true, startTime: true, providerId: true },
    });
    if (futureAppts.length > 0) {
      await prisma.$transaction(async (tx) => {
        for (const fa of futureAppts) {
          await tx.appointment.update({ where: { id: fa.id }, data: { status: "CANCELLED" } });
          await tx.appointmentEvent.create({
            data: {
              appointmentId: fa.id,
              type: "cancel",
              actorType: isProvider ? "provider" : "client",
              actorId: isTokenAuth ? appointment.clientId : user?.id,
              metadata: { cancelledAsFuture: true },
            },
          });
        }
      });
      // Invalidate cache for all cancelled dates
      for (const fa of futureAppts) {
        await invalidateAvailability(fa.providerId, fa.startTime.toISOString().split("T")[0]);
      }
    }
  }

  // Invalidate availability cache for the appointment's date
  const datesToInvalidate = [appointment.startTime.toISOString().split("T")[0]];
  if (action === "reschedule" && startTime) {
    datesToInvalidate.push(new Date(startTime).toISOString().split("T")[0]);
  }
  await invalidateAvailability(appointment.providerId, ...datesToInvalidate);

  // ─── Notify waitlist when a slot frees up ─────────────
  if (action === "cancel" || action === "reschedule" || action === "no_show") {
    // Notify for the original date (now freed), with the specific slot time
    notifyWaitlistForDate(
      appointment.providerId,
      appointment.startTime.toISOString().split("T")[0],
      appointment.startTime.toISOString(),
    ).catch((e) => console.error("[waitlist] Failed to notify:", e));
  }

  // ─── Post-action notifications ──────────────────────────
  if (action === "cancel") {
    const cancelData: CancellationEmailData = {
      providerName: appointment.provider.businessName,
      serviceName: appointment.service.name,
      startTime: appointment.startTime,
      clientName: appointment.clientName,
      clientEmail: appointment.clientEmail,
      cancelledBy: isProvider ? "provider" : "client",
      timezone: appointment.provider.timezone,
    };
    try {
      await Promise.all([
        sendCancellationEmail(cancelData, appointment.providerId),
        // Only notify provider when client cancels
        !isProvider
          ? sendProviderCancellation(appointment.provider.user.email, cancelData, appointment.providerId)
          : Promise.resolve(),
      ]);
    } catch (e) {
      console.error("[email] Failed to send cancellation emails:", e);
    }
    if (appointment.clientPhone) {
      sendCancellationSms(
        appointment.clientPhone,
        appointment.provider.businessName,
        appointment.service.name,
        appointment.providerId,
      ).catch((e) => console.error("[sms] Failed:", e));
    }
    // Remove scheduled reminders for cancelled appointment
    cancelReminders(appointment.id).catch((e) =>
      console.error("[jobs] Failed to cancel reminders:", e)
    );
  }

  if (action === "complete") {
    // Build payment URL if there's a remaining balance
    let paymentUrl: string | undefined;
    let completionTotalInCents: number | undefined;
    let completionDepositInCents: number | undefined;
    if (appointment.depositInCents > 0 && appointment.totalInCents > appointment.depositInCents) {
      // Check if balance already paid via BALANCE payments
      const balancePayments = await prisma.payment.aggregate({
        where: { appointmentId: appointment.id, type: "BALANCE", status: "COMPLETED" },
        _sum: { amountInCents: true },
      });
      const balancePaid = balancePayments._sum.amountInCents || 0;
      const remaining = appointment.totalInCents - appointment.depositInCents - balancePaid;
      if (remaining > 0) {
        const baseUrl = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";
        paymentUrl = `${baseUrl}/${appointment.provider.slug}/pay/${appointment.id}`;
        completionTotalInCents = appointment.totalInCents;
        completionDepositInCents = appointment.depositInCents;
      }
    }

    try {
      await sendCompletionThankYou({
        providerName: appointment.provider.businessName,
        serviceName: appointment.service.name,
        startTime: appointment.startTime,
        clientName: appointment.clientName,
        clientEmail: appointment.clientEmail,
        timezone: appointment.provider.timezone,
        appointmentId: appointment.id,
        slug: appointment.provider.slug,
        totalInCents: completionTotalInCents,
        depositInCents: completionDepositInCents,
        paymentUrl,
      }, appointment.providerId);
    } catch (e) {
      console.error("[email] Failed to send completion email:", e);
    }
    // Schedule follow-up email (2h after completion)
    scheduleFollowup(appointment.id).catch((e) =>
      console.error("[jobs] Failed to schedule followup:", e)
    );
  }

  if (action === "no_show") {
    // Remove scheduled reminders for no-show
    cancelReminders(appointment.id).catch((e) =>
      console.error("[jobs] Failed to cancel reminders:", e)
    );
  }

  if (action === "reschedule" && startTime) {
    // Re-send the booking confirmation with the new time so the client has
    // an updated email reference + manage link.
    try {
      const newStart = new Date(startTime);
      const newEnd = new Date(
        newStart.getTime() + appointment.service.durationMinutes * 60 * 1000,
      );
      const paymentType: "CASH" | "DEPOSIT" | "FULL" | "FREE" =
        appointment.totalInCents === 0
          ? "FREE"
          : appointment.depositInCents > 0 &&
            appointment.depositInCents < appointment.totalInCents
            ? "DEPOSIT"
            : appointment.depositInCents >= appointment.totalInCents
              ? "FULL"
              : "CASH";
      await sendClientConfirmation(
        {
          providerName: appointment.provider.businessName,
          serviceName: appointment.service.name,
          durationMinutes: appointment.service.durationMinutes,
          startTime: newStart,
          endTime: newEnd,
          totalInCents: appointment.totalInCents,
          depositInCents: appointment.depositInCents,
          paymentType,
          locationAddress: appointment.provider.locationAddress,
          cancellationHours: appointment.provider.cancellationHours,
          arrivalGraceMinutes: appointment.provider.arrivalGraceMinutes,
          clientName: appointment.clientName,
          clientEmail: appointment.clientEmail,
          timezone: appointment.provider.timezone,
          slug: appointment.provider.slug,
          appointmentId: appointment.id,
          manageToken: appointment.manageToken ?? undefined,
        },
        appointment.providerId,
      );
    } catch (e) {
      console.error("[email] Failed to send reschedule confirmation:", e);
    }
    // Re-schedule reminders to fire relative to the new time.
    cancelReminders(appointment.id)
      .then(() => scheduleReminders(appointment.id, new Date(startTime)))
      .catch((e) => console.error("[jobs] Failed to reschedule reminders:", e));
  }

  return success(updated);
}
