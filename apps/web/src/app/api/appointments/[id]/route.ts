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
  type CancellationEmailData,
} from "@/lib/email";
import { cancelReminders, scheduleFollowup } from "@/lib/schedule-jobs";
import { sendCancellationSms } from "@/lib/sms";

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
      provider: { select: { businessName: true, slug: true, timezone: true } },
      client: { select: { firstName: true, lastName: true, avatarUrl: true } },
      coupon: { select: { code: true, type: true, value: true } },
      events: { orderBy: { createdAt: "asc" } },
      payments: { orderBy: { createdAt: "desc" } },
      feedback: { select: { id: true } },
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
    include: {
      service: true,
      provider: { include: { user: { select: { email: true } } } },
    },
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

  return success(updated);
}
