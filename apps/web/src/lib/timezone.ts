/**
 * Timezone utilities for converting between wall-clock times and UTC.
 *
 * The booking system stores all times as real UTC. Provider availability rules
 * are defined in wall-clock time (e.g., "09:00" meaning 9 AM in their timezone).
 * This module converts between the two.
 */

/**
 * Convert a wall-clock time on a specific date in a given timezone to UTC.
 *
 * Example: wallClockToUTC("2026-03-15", 9, 0, "America/New_York")
 *   → Date representing 14:00 UTC (9 AM EST = 14:00 UTC)
 */
export function wallClockToUTC(
  dateStr: string, // "YYYY-MM-DD"
  hour: number,
  minute: number,
  timezone: string,
): Date {
  const pad = (n: number) => String(n).padStart(2, "0");
  // Treat the wall-clock time as if it were UTC
  const asUTC = new Date(`${dateStr}T${pad(hour)}:${pad(minute)}:00Z`);

  // Find the offset between UTC and the target timezone at this approximate time
  const utcStr = asUTC.toLocaleString("en-US", { timeZone: "UTC" });
  const tzStr = asUTC.toLocaleString("en-US", { timeZone: timezone });

  const utcDate = new Date(utcStr);
  const tzDate = new Date(tzStr);
  const offsetMs = utcDate.getTime() - tzDate.getTime();

  // The actual UTC time = wall-clock-as-UTC + offset
  return new Date(asUTC.getTime() + offsetMs);
}

/**
 * Get the UTC boundaries (start/end) for a calendar date in a given timezone.
 *
 * Example: dayBoundsUTC("2026-03-15", "America/New_York")
 *   → { start: 2026-03-15T05:00:00Z, end: 2026-03-16T05:00:00Z }
 */
export function dayBoundsUTC(
  dateStr: string,
  timezone: string,
): { start: Date; end: Date } {
  const [y, m, d] = dateStr.split("-").map(Number);
  const nextDay = new Date(Date.UTC(y, m - 1, d + 1));
  const nextDateStr = nextDay.toISOString().split("T")[0];

  return {
    start: wallClockToUTC(dateStr, 0, 0, timezone),
    end: wallClockToUTC(nextDateStr, 0, 0, timezone),
  };
}
