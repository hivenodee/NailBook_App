"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import {
  PAYMENT_METHOD_LABELS,
  formatLongDate,
  formatPrice,
  formatTime,
} from "./helpers";
import type {
  AddOnData,
  AppliedCoupon,
  PaymentMethod,
  RecurrenceFreq,
  ServiceData,
  TimeSlot,
} from "./types";

export type StepReviewProps = {
  service: ServiceData;
  selectedSlot: TimeSlot;
  selectedAddOns: AddOnData[];
  totalDurationMin: number;
  totalBeforeDiscount: number;
  discountCents: number;
  totalPriceCents: number;
  depositAmount: number;
  clientName: string;

  recurrenceEnabled: boolean;
  recurrenceFreq: RecurrenceFreq;
  recurrenceCount: number;

  // Coupon
  appliedCoupon: AppliedCoupon | null;
  couponInput: string;
  setCouponInput: (v: string) => void;
  handleApplyCoupon: () => void;
  removeCoupon: () => void;
  couponError: string | null;
  couponLoading: boolean;

  // Payment
  availableMethods: PaymentMethod[];
  selectedPaymentMethod: PaymentMethod | null;
  setSelectedPaymentMethod: (m: PaymentMethod) => void;
};

export function StepReview(props: StepReviewProps): React.JSX.Element {
  const {
    service,
    selectedSlot,
    selectedAddOns,
    totalDurationMin,
    totalBeforeDiscount,
    discountCents,
    totalPriceCents,
    depositAmount,
    clientName,
    recurrenceEnabled,
    recurrenceFreq,
    recurrenceCount,
    appliedCoupon,
    couponInput,
    setCouponInput,
    handleApplyCoupon,
    removeCoupon,
    couponError,
    couponLoading,
    availableMethods,
    selectedPaymentMethod,
    setSelectedPaymentMethod,
  } = props;

  const isCash = selectedPaymentMethod === "CASH";
  const isFree = totalPriceCents === 0;

  return (
    <div className="space-y-6">
      {/* Summary */}
      <div className="rounded-md border border-ink-200 bg-cream-50 p-5 space-y-2.5">
        <SummaryRow
          label="Service"
          value={service.name}
        />
        <SummaryRow
          label="Date"
          value={formatLongDate(selectedSlot.startTime, service.provider.timezone)}
        />
        <SummaryRow
          label="Time"
          value={formatTime(selectedSlot.startTime, service.provider.timezone)}
        />
        <SummaryRow label="Duration" value={`${totalDurationMin} min`} />
        <SummaryRow label="Name" value={clientName} />
        {recurrenceEnabled && (
          <SummaryRow
            label="Repeats"
            value={`${recurrenceCount}× ${
              recurrenceFreq === "WEEKLY"
                ? "weekly"
                : recurrenceFreq === "BIWEEKLY"
                  ? "every 2 weeks"
                  : "monthly"
            }`}
          />
        )}

        {selectedAddOns.length > 0 && (
          <>
            <Divider />
            <SummaryRow
              label="Base service"
              value={formatPrice(service.priceInCents)}
            />
            {selectedAddOns.map((a) => (
              <SummaryRow
                key={a.id}
                label={a.name}
                value={`+${formatPrice(a.priceInCents)}`}
              />
            ))}
          </>
        )}

        <Divider />

        {discountCents > 0 && (
          <>
            <SummaryRow
              label="Subtotal"
              value={formatPrice(totalBeforeDiscount)}
            />
            <SummaryRow
              label={`Discount (${appliedCoupon?.code})`}
              value={`–${formatPrice(discountCents)}`}
              accent
            />
          </>
        )}

        <SummaryRow
          label="Total"
          value={formatPrice(totalPriceCents)}
          emphasize
        />

        {!isCash && !isFree && depositAmount > 0 && (
          <>
            <SummaryRow
              label="Due now"
              value={formatPrice(depositAmount)}
              accent
              emphasize
            />
            <SummaryRow
              label="Due at appointment"
              value={formatPrice(totalPriceCents - depositAmount)}
            />
          </>
        )}

        {isFree && <SummaryRow label="Payment" value="Free" accent />}
        {isCash && !isFree && (
          <SummaryRow label="Payment" value="Pay at appointment" />
        )}
      </div>

      {/* Coupon */}
      <div className="rounded-md border border-ink-200 bg-cream-50 p-5 space-y-3">
        {appliedCoupon ? (
          <div className="flex items-center justify-between">
            <div className="flex items-baseline gap-2">
              <span className="font-display italic text-base text-rust-500 border-b border-rust-500 pb-px">
                {appliedCoupon.code}
              </span>
              <span className="font-sans text-xs text-ink-500">
                {appliedCoupon.type === "PERCENT"
                  ? `${appliedCoupon.value}% off`
                  : `${formatPrice(appliedCoupon.value)} off`}
              </span>
            </div>
            <button
              type="button"
              onClick={removeCoupon}
              className="font-sans text-xs text-ink-500 hover:text-ink-900 transition-colors"
            >
              Remove
            </button>
          </div>
        ) : (
          <>
            <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
              Have a code?
            </p>
            <div className="flex gap-2">
              <input
                type="text"
                value={couponInput}
                onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                placeholder="ENTER CODE"
                className="h-11 flex-1 rounded-md border border-ink-300 bg-cream-50 px-3 font-sans text-sm uppercase tracking-wide text-ink-900 placeholder:text-ink-300 transition-colors hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              />
              <button
                type="button"
                onClick={handleApplyCoupon}
                disabled={couponLoading || !couponInput.trim()}
                className="rounded-md bg-rust-500 px-4 font-sans text-sm font-medium text-cream-50 transition-all duration-200 hover:bg-rust-600 hover:-translate-y-px disabled:opacity-50 disabled:hover:translate-y-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              >
                {couponLoading ? "…" : "Apply"}
              </button>
            </div>
            {couponError && (
              <p className="font-sans text-xs text-error">{couponError}</p>
            )}
          </>
        )}
      </div>

      {/* Payment method */}
      {availableMethods.length > 0 && (
        <div className="space-y-2">
          <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
            Payment method
          </p>
          <div className="grid gap-2">
            {availableMethods.map((method) => {
              const selected = selectedPaymentMethod === method;
              return (
                <button
                  key={method}
                  type="button"
                  onClick={() => setSelectedPaymentMethod(method)}
                  className={cn(
                    "flex items-center justify-between rounded-md border px-4 py-3 text-left transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                    selected
                      ? "border-rust-500 bg-rust-500/5"
                      : "border-ink-200 bg-cream-50 hover:border-ink-300",
                  )}
                >
                  <span className="font-sans text-sm text-ink-900">
                    {PAYMENT_METHOD_LABELS[method]}
                  </span>
                  <span
                    aria-hidden="true"
                    className={cn(
                      "flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border",
                      selected ? "border-rust-500" : "border-ink-300",
                    )}
                  >
                    {selected && (
                      <span className="h-2 w-2 rounded-pill bg-rust-500" />
                    )}
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Policies */}
      <p className="font-sans text-xs text-ink-500 leading-relaxed">
        Cancel at least {service.provider.cancellationHours}h ahead for a full
        refund. Arrive within {service.provider.arrivalGraceMinutes} minutes of
        your appointment.
      </p>
    </div>
  );
}

function SummaryRow({
  label,
  value,
  emphasize = false,
  accent = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-sans text-sm text-ink-500">{label}</span>
      <span
        className={cn(
          "font-sans text-sm",
          emphasize && "font-display text-base",
          accent ? "text-rust-500" : "text-ink-900",
        )}
      >
        {value}
      </span>
    </div>
  );
}

function Divider(): React.JSX.Element {
  return <hr className="border-ink-200" />;
}
