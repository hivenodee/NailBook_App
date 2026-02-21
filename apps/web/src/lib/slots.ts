/**
 * Pure time-slot generation logic.
 * Extracted from api/availability/[slug]/route.ts for testability.
 */

import { wallClockToUTC } from "./timezone";

export type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

/**
 * Generate bookable time slots from availability rules,
 * marking slots as unavailable if they overlap with existing appointments.
 */
export function generateTimeSlots(
  rules: Array<{ startTime: string; endTime: string }>,
  dateStr: string,
  timezone: string,
  slotIncrementMinutes: number,
  bookedAppointments: Array<{ startTime: Date; endTime: Date }>,
  bufferMinutes = 0,
): TimeSlot[] {
  const slots: TimeSlot[] = [];
  const bufferMs = bufferMinutes * 60 * 1000;

  for (const rule of rules) {
    const [startHour, startMin] = rule.startTime.split(":").map(Number);
    const [endHour, endMin] = rule.endTime.split(":").map(Number);

    const ruleStart = wallClockToUTC(dateStr, startHour, startMin, timezone);
    const ruleEnd = wallClockToUTC(dateStr, endHour, endMin, timezone);

    let cursor = new Date(ruleStart);
    while (cursor < ruleEnd) {
      const slotEnd = new Date(
        cursor.getTime() + slotIncrementMinutes * 60 * 1000,
      );

      // Extend each booked appointment's end by buffer time for overlap check
      const isBooked = bookedAppointments.some(
        (a) => a.startTime < slotEnd && new Date(a.endTime.getTime() + bufferMs) > cursor,
      );

      slots.push({
        startTime: cursor.toISOString(),
        endTime: slotEnd.toISOString(),
        available: !isBooked,
      });

      cursor = slotEnd;
    }
  }

  return slots;
}
