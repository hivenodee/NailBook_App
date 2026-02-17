import { describe, it, expect } from "vitest";
import {
  calculateAddOnTotals,
  calculateDiscount,
  calculateDeposit,
  calculateBalance,
  hasOverlap,
} from "./pricing";

// ─── Add-on totals ──────────────────────────────────────

describe("calculateAddOnTotals", () => {
  it("sums prices and durations of multiple add-ons", () => {
    const result = calculateAddOnTotals([
      { priceInCents: 500, durationMinutes: 10 },
      { priceInCents: 1000, durationMinutes: 15 },
      { priceInCents: 250, durationMinutes: 5 },
    ]);
    expect(result.priceCents).toBe(1750);
    expect(result.durationMinutes).toBe(30);
  });

  it("returns zero for empty add-ons", () => {
    const result = calculateAddOnTotals([]);
    expect(result.priceCents).toBe(0);
    expect(result.durationMinutes).toBe(0);
  });
});

// ─── Coupon discount ────────────────────────────────────

describe("calculateDiscount", () => {
  it("applies percent discount correctly", () => {
    expect(calculateDiscount(10000, "PERCENT", 20)).toBe(2000);
  });

  it("caps percent discount at the total", () => {
    expect(calculateDiscount(5000, "PERCENT", 150)).toBe(5000);
  });

  it("rounds percent discount to nearest cent", () => {
    // 33% of 10000 = 3300 (exact)
    expect(calculateDiscount(10000, "PERCENT", 33)).toBe(3300);
    // 33% of 999 = 329.67 → rounds to 330
    expect(calculateDiscount(999, "PERCENT", 33)).toBe(330);
  });

  it("applies fixed discount correctly", () => {
    expect(calculateDiscount(10000, "FIXED", 2500)).toBe(2500);
  });

  it("caps fixed discount at the total", () => {
    expect(calculateDiscount(1000, "FIXED", 5000)).toBe(1000);
  });

  it("handles zero total", () => {
    expect(calculateDiscount(0, "PERCENT", 50)).toBe(0);
    expect(calculateDiscount(0, "FIXED", 500)).toBe(0);
  });
});

// ─── Deposit calculation ────────────────────────────────

describe("calculateDeposit", () => {
  it("returns zero for NONE deposit type", () => {
    expect(calculateDeposit(10000, "NONE", 0)).toBe(0);
    expect(calculateDeposit(10000, "NONE", 5000)).toBe(0);
  });

  it("returns flat deposit capped at total", () => {
    expect(calculateDeposit(10000, "FLAT", 2000)).toBe(2000);
    expect(calculateDeposit(1000, "FLAT", 5000)).toBe(1000);
  });

  it("returns percent deposit", () => {
    expect(calculateDeposit(10000, "PERCENT", 50)).toBe(5000);
    expect(calculateDeposit(7500, "PERCENT", 20)).toBe(1500);
  });

  it("rounds percent deposit to nearest cent", () => {
    // 33% of 10000 = 3300 (exact), 33% of 10001 = 3300.33 → 3300
    expect(calculateDeposit(10000, "PERCENT", 33)).toBe(3300);
    expect(calculateDeposit(10001, "PERCENT", 33)).toBe(3300);
    // 33% of 10003 = 3300.99 → 3301
    expect(calculateDeposit(10003, "PERCENT", 33)).toBe(3301);
  });
});

// ─── Balance calculation ────────────────────────────────

describe("calculateBalance", () => {
  it("calculates remaining balance correctly", () => {
    const result = calculateBalance(10000, 2000, 0);
    expect(result.remainingInCents).toBe(8000);
    expect(result.isPaid).toBe(false);
  });

  it("accounts for partial balance payments", () => {
    const result = calculateBalance(10000, 2000, 3000);
    expect(result.remainingInCents).toBe(5000);
    expect(result.isPaid).toBe(false);
  });

  it("marks as paid when fully collected", () => {
    const result = calculateBalance(10000, 2000, 8000);
    expect(result.remainingInCents).toBe(0);
    expect(result.isPaid).toBe(true);
  });

  it("clamps overpayment to zero remaining", () => {
    const result = calculateBalance(10000, 2000, 9000);
    expect(result.remainingInCents).toBe(0);
    expect(result.isPaid).toBe(true);
  });

  it("handles full payment (no deposit)", () => {
    const result = calculateBalance(5000, 0, 5000);
    expect(result.remainingInCents).toBe(0);
    expect(result.isPaid).toBe(true);
  });

  it("handles zero-price appointment", () => {
    const result = calculateBalance(0, 0, 0);
    expect(result.remainingInCents).toBe(0);
    expect(result.isPaid).toBe(true);
  });
});

// ─── Overlap detection ──────────────────────────────────

describe("hasOverlap", () => {
  const existing = [
    {
      startTime: new Date("2026-03-15T10:00:00Z"),
      endTime: new Date("2026-03-15T11:00:00Z"),
    },
    {
      startTime: new Date("2026-03-15T14:00:00Z"),
      endTime: new Date("2026-03-15T15:30:00Z"),
    },
  ];

  it("detects overlap when new slot falls inside existing", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T10:15:00Z"),
        new Date("2026-03-15T10:45:00Z"),
        existing,
      ),
    ).toBe(true);
  });

  it("detects overlap when new slot spans across existing", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T09:30:00Z"),
        new Date("2026-03-15T11:30:00Z"),
        existing,
      ),
    ).toBe(true);
  });

  it("detects overlap when new slot starts before and ends during", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T09:30:00Z"),
        new Date("2026-03-15T10:30:00Z"),
        existing,
      ),
    ).toBe(true);
  });

  it("returns false when slot is exactly adjacent (no gap)", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T11:00:00Z"),
        new Date("2026-03-15T12:00:00Z"),
        existing,
      ),
    ).toBe(false);
  });

  it("returns false for a gap between appointments", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T12:00:00Z"),
        new Date("2026-03-15T13:00:00Z"),
        existing,
      ),
    ).toBe(false);
  });

  it("returns false with no existing appointments", () => {
    expect(
      hasOverlap(
        new Date("2026-03-15T10:00:00Z"),
        new Date("2026-03-15T11:00:00Z"),
        [],
      ),
    ).toBe(false);
  });
});
