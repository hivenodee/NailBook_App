import { describe, it, expect } from "vitest";
import { wallClockToUTC, dayBoundsUTC } from "./timezone";

describe("wallClockToUTC", () => {
  it("converts UTC wall-clock time to itself", () => {
    const result = wallClockToUTC("2026-03-15", 9, 0, "UTC");
    expect(result.toISOString()).toBe("2026-03-15T09:00:00.000Z");
  });

  it("converts EST (UTC-5) wall-clock to UTC", () => {
    // Jan 15 is EST (standard time, UTC-5)
    const result = wallClockToUTC("2026-01-15", 9, 0, "America/New_York");
    expect(result.toISOString()).toBe("2026-01-15T14:00:00.000Z");
  });

  it("converts EDT (UTC-4) wall-clock to UTC during DST", () => {
    // July 15 is EDT (daylight saving, UTC-4)
    const result = wallClockToUTC("2026-07-15", 9, 0, "America/New_York");
    expect(result.toISOString()).toBe("2026-07-15T13:00:00.000Z");
  });

  it("handles midnight correctly", () => {
    const result = wallClockToUTC("2026-03-15", 0, 0, "UTC");
    expect(result.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });

  it("handles minutes correctly", () => {
    const result = wallClockToUTC("2026-03-15", 14, 30, "UTC");
    expect(result.toISOString()).toBe("2026-03-15T14:30:00.000Z");
  });

  it("handles positive UTC offset timezone", () => {
    // Tokyo is UTC+9
    const result = wallClockToUTC("2026-03-15", 9, 0, "Asia/Tokyo");
    expect(result.toISOString()).toBe("2026-03-15T00:00:00.000Z");
  });
});

describe("dayBoundsUTC", () => {
  it("returns midnight-to-midnight for UTC", () => {
    const { start, end } = dayBoundsUTC("2026-03-15", "UTC");
    expect(start.toISOString()).toBe("2026-03-15T00:00:00.000Z");
    expect(end.toISOString()).toBe("2026-03-16T00:00:00.000Z");
  });

  it("shifts bounds for non-UTC timezone", () => {
    // EST (Jan, UTC-5): midnight EST = 05:00 UTC
    const { start, end } = dayBoundsUTC("2026-01-15", "America/New_York");
    expect(start.toISOString()).toBe("2026-01-15T05:00:00.000Z");
    expect(end.toISOString()).toBe("2026-01-16T05:00:00.000Z");
  });

  it("spans exactly 24 hours", () => {
    const { start, end } = dayBoundsUTC("2026-06-15", "America/New_York");
    const durationHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
    expect(durationHours).toBe(24);
  });
});
