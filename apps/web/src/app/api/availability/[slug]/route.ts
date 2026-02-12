import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { BOOKING } from "@nailbook/shared";

export const dynamic = "force-dynamic";

// Optional Redis — works without it
async function getCached(key: string) {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return null;
  try {
    const { redis } = await import("@/lib/redis");
    return await redis.get(key);
  } catch {
    return null;
  }
}

async function setCache(key: string, value: unknown, ttl: number) {
  if (!process.env.REDIS_URL || !process.env.REDIS_TOKEN) return;
  try {
    const { redis } = await import("@/lib/redis");
    await redis.set(key, value, { ex: ttl });
  } catch {
    // Cache miss is fine
  }
}

// GET /api/availability/:slug?date=2026-03-15
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ slug: string }> }
) {
  const { slug } = await params;
  const dateStr = new URL(request.url).searchParams.get("date");
  if (!dateStr) return error("date query param is required (YYYY-MM-DD)");

  const provider = await prisma.provider.findUnique({ where: { slug } });
  if (!provider) return error("Provider not found", 404);

  // Check cache
  const cacheKey = `avail:${provider.id}:${dateStr}`;
  const cached = await getCached(cacheKey);
  if (cached) return success(cached);

  const date = new Date(dateStr);
  const dayOfWeek = date.getUTCDay();

  // Get availability rules for this day
  const rules = await prisma.availabilityRule.findMany({
    where: {
      providerId: provider.id,
      dayOfWeek,
      isActive: true,
    },
  });

  if (rules.length === 0) return success([]);

  // Check time off
  const dayStart = new Date(dateStr + "T00:00:00Z");
  const dayEnd = new Date(dateStr + "T23:59:59Z");

  const timeOff = await prisma.timeOff.findFirst({
    where: {
      providerId: provider.id,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });
  if (timeOff) return success([]);

  // Get confirmed appointments for this day
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startTime: { gte: dayStart, lte: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  // Generate time slots from availability rules
  const slots: { startTime: string; endTime: string; available: boolean }[] = [];

  for (const rule of rules) {
    const [startHour, startMin] = rule.startTime.split(":").map(Number);
    const [endHour, endMin] = rule.endTime.split(":").map(Number);

    const ruleStart = new Date(date);
    ruleStart.setUTCHours(startHour, startMin, 0, 0);

    const ruleEnd = new Date(date);
    ruleEnd.setUTCHours(endHour, endMin, 0, 0);

    let cursor = new Date(ruleStart);
    while (cursor < ruleEnd) {
      const slotEnd = new Date(
        cursor.getTime() + BOOKING.SLOT_INCREMENT_MINUTES * 60 * 1000
      );

      const isBooked = appointments.some(
        (a) => a.startTime < slotEnd && a.endTime > cursor
      );

      slots.push({
        startTime: cursor.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !isBooked,
      });

      cursor = slotEnd;
    }
  }

  // Cache for 60 seconds
  await setCache(cacheKey, slots, 60);

  return success(slots);
}
