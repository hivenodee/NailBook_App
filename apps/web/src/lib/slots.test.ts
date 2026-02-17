import { describe, it, expect } from "vitest";
import { generateTimeSlots } from "./slots";

describe("generateTimeSlots", () => {
  // Use UTC timezone to avoid DST complexity in tests
  const TZ = "UTC";

  it("generates correct number of 15-min slots for a 2-hour rule", () => {
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "11:00" }],
      "2026-03-15",
      TZ,
      15,
      [],
    );
    // 2 hours / 15 min = 8 slots
    expect(slots).toHaveLength(8);
    expect(slots[0].startTime).toBe("2026-03-15T09:00:00.000Z");
    expect(slots[0].endTime).toBe("2026-03-15T09:15:00.000Z");
    expect(slots[7].startTime).toBe("2026-03-15T10:45:00.000Z");
    expect(slots[7].endTime).toBe("2026-03-15T11:00:00.000Z");
  });

  it("marks all slots as available when no appointments exist", () => {
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "10:00" }],
      "2026-03-15",
      TZ,
      15,
      [],
    );
    expect(slots.every((s) => s.available)).toBe(true);
  });

  it("marks overlapping slots as unavailable", () => {
    const booked = [
      {
        startTime: new Date("2026-03-15T09:30:00Z"),
        endTime: new Date("2026-03-15T10:30:00Z"),
      },
    ];
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "11:00" }],
      "2026-03-15",
      TZ,
      15,
      booked,
    );

    // 09:00-09:15 → available
    expect(slots[0].available).toBe(true);
    // 09:15-09:30 → available (ends exactly at booking start)
    expect(slots[1].available).toBe(true);
    // 09:30-09:45 → unavailable (overlaps)
    expect(slots[2].available).toBe(false);
    // 09:45-10:00 → unavailable
    expect(slots[3].available).toBe(false);
    // 10:00-10:15 → unavailable
    expect(slots[4].available).toBe(false);
    // 10:15-10:30 → unavailable
    expect(slots[5].available).toBe(false);
    // 10:30-10:45 → available (starts exactly at booking end)
    expect(slots[6].available).toBe(true);
    // 10:45-11:00 → available
    expect(slots[7].available).toBe(true);
  });

  it("combines slots from multiple rules", () => {
    const slots = generateTimeSlots(
      [
        { startTime: "09:00", endTime: "10:00" },
        { startTime: "14:00", endTime: "15:00" },
      ],
      "2026-03-15",
      TZ,
      15,
      [],
    );
    // 4 from first rule + 4 from second rule
    expect(slots).toHaveLength(8);
    expect(slots[0].startTime).toBe("2026-03-15T09:00:00.000Z");
    expect(slots[4].startTime).toBe("2026-03-15T14:00:00.000Z");
  });

  it("returns no slots when rule has zero duration", () => {
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "09:00" }],
      "2026-03-15",
      TZ,
      15,
      [],
    );
    expect(slots).toHaveLength(0);
  });

  it("handles 30-minute slot increments", () => {
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "11:00" }],
      "2026-03-15",
      TZ,
      30,
      [],
    );
    expect(slots).toHaveLength(4);
    expect(slots[0].endTime).toBe("2026-03-15T09:30:00.000Z");
    expect(slots[1].startTime).toBe("2026-03-15T09:30:00.000Z");
  });

  it("applies timezone offset to slot times", () => {
    // America/New_York is UTC-5 in standard time (March 15 is EDT = UTC-4)
    const slots = generateTimeSlots(
      [{ startTime: "09:00", endTime: "09:15" }],
      "2026-03-15",
      "America/New_York",
      15,
      [],
    );
    expect(slots).toHaveLength(1);
    // 9 AM EDT = 13:00 UTC
    expect(slots[0].startTime).toBe("2026-03-15T13:00:00.000Z");
    expect(slots[0].endTime).toBe("2026-03-15T13:15:00.000Z");
  });
});
