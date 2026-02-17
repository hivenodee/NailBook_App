import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error, parseBody } from "@/lib/api-utils";
import { joinWaitlistSchema } from "@nailbook/shared";
import { sendWaitlistJoinedEmail } from "@/lib/email";
import { sendWaitlistJoinedSms } from "@/lib/sms";
import { formatDateForEmail } from "@/lib/waitlist";
import { strictRateLimit } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// POST /api/waitlist — join waitlist (public, no auth required)
export async function POST(request: NextRequest) {
  const limited = await strictRateLimit(request);
  if (limited) return limited;

  const result = await parseBody(request, joinWaitlistSchema);
  if (result.error) return result.error;

  const { serviceId, targetDate, targetTime, timePreference, clientName, clientEmail, clientPhone } =
    result.data;

  // Resolve provider from service
  const service = await prisma.service.findUnique({
    where: { id: serviceId },
    select: { id: true, name: true, providerId: true },
  });
  if (!service) return error("Service not found", 404);

  // Fetch provider details for email
  const provider = await prisma.provider.findUnique({
    where: { id: service.providerId },
    select: { businessName: true, timezone: true },
  });

  // Reject past dates
  const target = new Date(`${targetDate}T00:00:00.000Z`);
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  if (target < today) return error("Cannot join waitlist for a past date", 400);

  const parsedTargetTime = targetTime ? new Date(targetTime) : null;
  const normalizedEmail = clientEmail.toLowerCase().trim();

  // Find existing entry (can't use compound unique upsert with nullable targetTime)
  const existing = await prisma.waitlistEntry.findFirst({
    where: {
      providerId: service.providerId,
      clientEmail: normalizedEmail,
      targetDate: target,
      targetTime: parsedTargetTime,
    },
  });

  let entry;
  if (existing) {
    entry = await prisma.waitlistEntry.update({
      where: { id: existing.id },
      data: {
        status: "ACTIVE",
        serviceId,
        timePreference,
        clientName,
        clientPhone: clientPhone || null,
      },
    });
  } else {
    entry = await prisma.waitlistEntry.create({
      data: {
        providerId: service.providerId,
        serviceId,
        targetDate: target,
        targetTime: parsedTargetTime,
        timePreference,
        clientName,
        clientEmail: normalizedEmail,
        clientPhone: clientPhone || null,
      },
    });
  }

  // Send confirmation email + SMS (fire-and-forget)
  const tz = provider?.timezone || "America/New_York";
  // targetDate is stored as midnight UTC — format in UTC to avoid day shift
  const formattedDate = formatDateForEmail(target, "UTC");
  let formattedTime: string | undefined;
  if (parsedTargetTime) {
    formattedTime = parsedTargetTime.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      timeZone: tz,
    });
  }

  sendWaitlistJoinedEmail(
    {
      providerName: provider?.businessName || "Provider",
      serviceName: service.name,
      clientName,
      clientEmail: normalizedEmail,
      date: formattedDate,
      time: formattedTime,
    },
    service.providerId,
  ).catch((e) => console.error("[waitlist] Failed to send joined email:", e));

  if (clientPhone) {
    const smsVars: Record<string, string> = {
      providerName: provider?.businessName || "Provider",
      serviceName: service.name,
      clientName,
      clientEmail: normalizedEmail,
      date: formattedDate,
      time: formattedTime ? ` at ${formattedTime}` : "",
    };
    sendWaitlistJoinedSms(clientPhone, smsVars, service.providerId).catch((e) =>
      console.error("[waitlist] Failed to send joined SMS:", e),
    );
  }

  return success({ id: entry.id, status: entry.status }, 201);
}
