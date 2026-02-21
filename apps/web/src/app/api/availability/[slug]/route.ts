import { NextRequest } from "next/server";
import { prisma } from "@/lib/db";
import { success, error } from "@/lib/api-utils";
import { BOOKING } from "@nailbook/shared";
import { getAvailabilityCache, setAvailabilityCache } from "@/lib/cache";
import { dayBoundsUTC } from "@/lib/timezone";
import { generateTimeSlots } from "@/lib/slots";

export const dynamic = "force-dynamic";

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

  const now = new Date();

  // Auto-open: if books are closed but scheduled open time has passed, open them
  if (!provider.booksOpen && provider.booksOpenAt && provider.booksOpenAt <= now) {
    await prisma.provider.update({
      where: { id: provider.id },
      data: { booksOpen: true, booksOpenAt: null },
    });
    provider.booksOpen = true;
    provider.booksOpenAt = null;
  }

  // Books closed guard
  if (!provider.booksOpen) {
    return success({
      booksOpen: false,
      booksOpenAt: provider.booksOpenAt?.toISOString() ?? null,
      timezone: provider.timezone,
      slots: [],
    });
  }

  // Window guard: requested date beyond booking window
  const maxDate = new Date();
  maxDate.setDate(maxDate.getDate() + provider.bookingWindowDays);
  const requestedDate = new Date(dateStr);
  if (requestedDate > maxDate) {
    return success({
      booksOpen: true,
      timezone: provider.timezone,
      slots: [],
      outsideWindow: true,
    });
  }

  // Check cache
  const cached = await getAvailabilityCache(provider.id, dateStr);
  if (cached) return success({ booksOpen: true, timezone: provider.timezone, slots: cached });

  const date = new Date(dateStr);
  const dayOfWeek = date.getUTCDay();
  const tz = provider.timezone;

  // Get availability rules for this day
  const rules = await prisma.availabilityRule.findMany({
    where: {
      providerId: provider.id,
      dayOfWeek,
      isActive: true,
    },
  });

  if (rules.length === 0) return success({ booksOpen: true, timezone: tz, slots: [] });

  // Day boundaries in provider's timezone (converted to UTC)
  const { start: dayStart, end: dayEnd } = dayBoundsUTC(dateStr, tz);

  // Check time off
  const timeOff = await prisma.timeOff.findFirst({
    where: {
      providerId: provider.id,
      startDate: { lte: dayEnd },
      endDate: { gte: dayStart },
    },
  });
  if (timeOff) return success({ booksOpen: true, timezone: tz, slots: [] });

  // Get confirmed appointments for this day
  const appointments = await prisma.appointment.findMany({
    where: {
      providerId: provider.id,
      status: { in: ["CONFIRMED", "PENDING_PAYMENT"] },
      startTime: { gte: dayStart, lt: dayEnd },
    },
    select: { startTime: true, endTime: true },
  });

  // Generate time slots from availability rules
  const slots = generateTimeSlots(rules, dateStr, tz, BOOKING.SLOT_INCREMENT_MINUTES, appointments, provider.bufferMinutes);

  await setAvailabilityCache(provider.id, dateStr, slots);

  return success({ booksOpen: true, timezone: tz, slots });
}
