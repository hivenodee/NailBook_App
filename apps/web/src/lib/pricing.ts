/**
 * Pure pricing/booking calculation helpers.
 * Extracted from api/appointments/route.ts for testability.
 */

export type DepositType = "NONE" | "FLAT" | "PERCENT";
export type CouponType = "PERCENT" | "FIXED";

/** Sum add-on prices and durations. */
export function calculateAddOnTotals(
  addOns: Array<{ priceInCents: number; durationMinutes: number }>,
): { priceCents: number; durationMinutes: number } {
  return {
    priceCents: addOns.reduce((sum, a) => sum + a.priceInCents, 0),
    durationMinutes: addOns.reduce((sum, a) => sum + a.durationMinutes, 0),
  };
}

/** Calculate discount amount from a coupon. */
export function calculateDiscount(
  totalBeforeDiscount: number,
  couponType: CouponType,
  couponValue: number,
): number {
  if (couponType === "PERCENT") {
    return Math.min(
      Math.round((totalBeforeDiscount * couponValue) / 100),
      totalBeforeDiscount,
    );
  }
  return Math.min(couponValue, totalBeforeDiscount);
}

/** Calculate deposit amount based on service settings. */
export function calculateDeposit(
  totalPriceCents: number,
  depositType: DepositType,
  depositValue: number,
): number {
  if (depositType === "FLAT") {
    return Math.min(depositValue, totalPriceCents);
  }
  if (depositType === "PERCENT") {
    return Math.round((totalPriceCents * depositValue) / 100);
  }
  return 0;
}

/** Calculate remaining balance from payment data. */
export function calculateBalance(
  totalInCents: number,
  depositInCents: number,
  balancePaidInCents: number,
): { remainingInCents: number; isPaid: boolean } {
  const remaining = totalInCents - depositInCents - balancePaidInCents;
  return {
    remainingInCents: Math.max(0, remaining),
    isPaid: remaining <= 0,
  };
}

/** Check if a proposed time range overlaps with any existing appointments. */
export function hasOverlap(
  newStart: Date,
  newEnd: Date,
  existing: Array<{ startTime: Date; endTime: Date }>,
): boolean {
  return existing.some((a) => a.startTime < newEnd && a.endTime > newStart);
}
