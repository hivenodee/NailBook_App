"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

export type FirstServiceDraft = {
  name: string;
  priceDollars: string; // string while typing, parsed to cents on submit
  durationMinutes: number;
  depositType: "NONE" | "FLAT" | "PERCENT";
  depositValue: string;
};

const DURATION_PRESETS = [30, 45, 60, 75, 90, 120, 150, 180];

export function StepFirstService({
  draft,
  onChange,
  onNext,
  submitting,
  submitError,
}: {
  draft: FirstServiceDraft;
  onChange: (next: Partial<FirstServiceDraft>) => void;
  onNext: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}): React.JSX.Element {
  const priceDollars = parseFloat(draft.priceDollars);
  const priceValid = !isNaN(priceDollars) && priceDollars > 0 && priceDollars < 100000;
  const nameValid = draft.name.trim().length > 0;

  const depositValueNum = parseFloat(draft.depositValue);
  const depositValid =
    draft.depositType === "NONE" ||
    (!isNaN(depositValueNum) &&
      depositValueNum > 0 &&
      (draft.depositType === "PERCENT" ? depositValueNum <= 100 : depositValueNum <= priceDollars));

  const canContinue = nameValid && priceValid && depositValid && !submitting;

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Service name"
        placeholder="Classic gel manicure"
        value={draft.name}
        onChange={(e) => onChange({ name: e.target.value })}
        maxLength={100}
        autoFocus
      />

      <div className="grid grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboarding-service-price" className="text-sm font-sans font-medium text-ink-700">
            Price
          </label>
          <div className="flex items-center rounded-md border border-ink-300 bg-cream-50 transition-colors duration-200 hover:border-ink-500 focus-within:border-ink-500">
            <span className="pl-4 font-display text-lg text-ink-500 select-none">$</span>
            <input
              id="onboarding-service-price"
              type="number"
              inputMode="decimal"
              min={1}
              step="0.01"
              value={draft.priceDollars}
              onChange={(e) => onChange({ priceDollars: e.target.value })}
              placeholder="65"
              className="h-11 w-full bg-transparent px-3 font-display text-lg text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <label htmlFor="onboarding-service-duration" className="text-sm font-sans font-medium text-ink-700">
            Duration
          </label>
          <select
            id="onboarding-service-duration"
            value={draft.durationMinutes}
            onChange={(e) => onChange({ durationMinutes: Number(e.target.value) })}
            className={cn(
              "h-11 px-4 text-base font-sans text-ink-900",
              "bg-cream-50 border border-ink-300 rounded-md hover:border-ink-500",
              "transition-colors duration-200",
              "focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
            )}
          >
            {DURATION_PRESETS.map((m) => (
              <option key={m} value={m}>
                {m >= 60
                  ? `${Math.floor(m / 60)}h${m % 60 ? ` ${m % 60}m` : ""}`
                  : `${m} min`}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        <label className="text-sm font-sans font-medium text-ink-700">Deposit (optional)</label>
        <div className="flex gap-2">
          {(["NONE", "FLAT", "PERCENT"] as const).map((t) => (
            <button
              key={t}
              type="button"
              onClick={() => onChange({ depositType: t })}
              className={cn(
                "flex-1 h-11 rounded-md border font-sans text-sm transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                draft.depositType === t
                  ? "border-rust-500 bg-rust-50/50 text-ink-900"
                  : "border-ink-200 bg-cream-50 text-ink-700 hover:border-ink-400",
              )}
              aria-pressed={draft.depositType === t}
            >
              {t === "NONE" ? "No deposit" : t === "FLAT" ? "Flat $" : "Percent %"}
            </button>
          ))}
        </div>

        {draft.depositType !== "NONE" && (
          <div className="flex items-center rounded-md border border-ink-300 bg-cream-50 transition-colors duration-200 focus-within:border-ink-500 hover:border-ink-500">
            {draft.depositType === "FLAT" && (
              <span className="pl-4 font-display text-lg text-ink-500 select-none">$</span>
            )}
            <input
              type="number"
              inputMode="decimal"
              min={0}
              step={draft.depositType === "FLAT" ? "0.01" : "1"}
              value={draft.depositValue}
              onChange={(e) => onChange({ depositValue: e.target.value })}
              placeholder={draft.depositType === "FLAT" ? "25" : "50"}
              className="h-11 w-full bg-transparent px-3 font-sans text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
            />
            {draft.depositType === "PERCENT" && (
              <span className="pr-4 font-display text-lg text-ink-500 select-none">%</span>
            )}
          </div>
        )}

        <p className="text-xs font-sans text-ink-500">
          Most providers ask for a 25–50% deposit. You can add more services later.
        </p>
      </div>

      {submitError && (
        <p className="text-sm font-sans text-error" role="alert">{submitError}</p>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canContinue}
          aria-label="Continue to your hours"
        >
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
