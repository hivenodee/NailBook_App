import { prisma } from "@/lib/db";
import { sendWaitlistAvailableEmail } from "@/lib/email";
import { sendWaitlistAvailableSms } from "@/lib/sms";
import { WAITLIST } from "@nailbook/shared";

export const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

export function formatDateForEmail(date: Date, timezone: string): string {
  return date.toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: timezone,
  });
}

/**
 * Mark ACTIVE waitlist entries as AVAILABLE when a slot frees up.
 * Provider must approve before client is notified.
 *
 * If `freedSlotTime` is provided, matches entries with that exact targetTime
 * OR day-level entries (targetTime = null).
 * If not provided (schedule changes), matches all entries for that date.
 *
 * Fire-and-forget — callers should `.catch()` this.
 */
export async function notifyWaitlistForDate(
  providerId: string,
  dateStr: string,
  freedSlotTime?: string,
): Promise<void> {
  // Build target date range (midnight to midnight UTC for the given date)
  const dayStart = new Date(`${dateStr}T00:00:00.000Z`);
  const dayEnd = new Date(`${dateStr}T23:59:59.999Z`);

  const slotTimeFilter = freedSlotTime
    ? {
        OR: [
          { targetTime: new Date(freedSlotTime) },
          { targetTime: null },
        ],
      }
    : {};

  const entries = await prisma.waitlistEntry.findMany({
    where: {
      providerId,
      targetDate: { gte: dayStart, lte: dayEnd },
      status: "ACTIVE",
      ...slotTimeFilter,
    },
    select: { id: true },
  });

  if (entries.length === 0) return;

  // Mark all matching entries as AVAILABLE (provider must approve)
  await prisma.waitlistEntry.updateMany({
    where: {
      id: { in: entries.map((e) => e.id) },
    },
    data: { status: "AVAILABLE" },
  });
}

/**
 * Approve a waitlist entry: send the "spot opened up" notification to the client.
 * Called by the provider from the dashboard.
 */
export async function approveWaitlistEntry(entryId: string): Promise<void> {
  const entry = await prisma.waitlistEntry.findUnique({
    where: { id: entryId },
    include: {
      provider: { select: { slug: true, businessName: true, timezone: true } },
      service: { select: { id: true, name: true } },
    },
  });

  if (!entry || entry.status !== "AVAILABLE") return;

  const tz = entry.provider.timezone || "America/New_York";
  const dateStr = entry.targetDate.toISOString().split("T")[0];
  // targetDate is midnight UTC — format in UTC to avoid day shift
  const formattedDate = formatDateForEmail(entry.targetDate, "UTC");
  const serviceParam = entry.serviceId ? `service=${entry.serviceId}&` : "";
  const bookingUrl = `${APP_URL}/${entry.provider.slug}/book?${serviceParam}date=${dateStr}`;

  const emailData = {
    providerName: entry.provider.businessName,
    serviceName: entry.service?.name || "an appointment",
    clientName: entry.clientName,
    clientEmail: entry.clientEmail,
    date: formattedDate,
    bookingUrl,
  };

  try {
    await sendWaitlistAvailableEmail(emailData, entry.providerId);
  } catch (e) {
    console.error(`[waitlist] Failed to send email to ${entry.clientEmail}:`, e);
  }

  // Send SMS if phone provided
  if (entry.clientPhone) {
    const smsVars: Record<string, string> = {
      providerName: entry.provider.businessName,
      serviceName: entry.service?.name || "an appointment",
      clientName: entry.clientName,
      clientEmail: entry.clientEmail,
      date: formattedDate,
      bookingUrl,
    };
    sendWaitlistAvailableSms(entry.clientPhone, smsVars, entry.providerId).catch((e) =>
      console.error(`[waitlist] Failed to send SMS to ${entry.clientPhone}:`, e),
    );
  }

  // Update entry status to NOTIFIED
  await prisma.waitlistEntry.update({
    where: { id: entryId },
    data: {
      status: "NOTIFIED",
      lastNotifiedAt: new Date(),
      notifyCount: { increment: 1 },
    },
  });
}

/**
 * For schedule rule changes: notify all future waitlist entries for a provider.
 * Fire-and-forget — callers should `.catch()` this.
 */
export async function notifyWaitlistAllFutureDates(
  providerId: string,
): Promise<void> {
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);

  const futureDates = await prisma.waitlistEntry.findMany({
    where: {
      providerId,
      targetDate: { gte: today },
      status: "ACTIVE",
    },
    select: { targetDate: true },
    distinct: ["targetDate"],
  });

  for (const { targetDate } of futureDates) {
    const dateStr = targetDate.toISOString().split("T")[0];
    await notifyWaitlistForDate(providerId, dateStr);
  }
}
