"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export type WeekRule = {
  dayOfWeek: number;
  startTime: string; // HH:mm
  endTime: string;
  isActive: boolean;
};

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Tasteful default: Tue–Sat 9am–6pm. Most service businesses live here.
export function defaultWeekRules(): WeekRule[] {
  return DAY_LABELS.map((_, i) => ({
    dayOfWeek: i,
    startTime: "09:00",
    endTime: "18:00",
    isActive: i >= 2 && i <= 6, // Tue (2) through Sat (6)
  }));
}

// HH:mm options every 30 minutes from 06:00 to 23:30.
const TIME_OPTIONS = (() => {
  const out: string[] = [];
  for (let h = 6; h < 24; h++) {
    for (const m of [0, 30]) {
      out.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return out;
})();

function formatTimeLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function StepHours({
  rules,
  onChange,
  onNext,
  submitting,
  submitError,
}: {
  rules: WeekRule[];
  onChange: (next: WeekRule[]) => void;
  onNext: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}): React.JSX.Element {
  function update(dow: number, patch: Partial<WeekRule>) {
    onChange(rules.map((r) => (r.dayOfWeek === dow ? { ...r, ...patch } : r)));
  }

  const validRules = rules.filter((r) => r.isActive);
  const hasOverlapError = validRules.some((r) => r.startTime >= r.endTime);
  const canContinue = validRules.length >= 1 && !hasOverlapError && !submitting;

  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col rounded-md border border-ink-200 bg-cream-50 overflow-hidden">
        {rules.map((r, idx) => (
          <div
            key={r.dayOfWeek}
            className={cn(
              "flex items-center gap-3 px-4 py-3",
              idx > 0 && "border-t border-ink-100",
              !r.isActive && "bg-cream-100",
            )}
          >
            <label className="flex items-center gap-2 w-20 shrink-0 cursor-pointer">
              <input
                type="checkbox"
                checked={r.isActive}
                onChange={(e) => update(r.dayOfWeek, { isActive: e.target.checked })}
                className="h-4 w-4 accent-rust-500 cursor-pointer"
              />
              <span className="font-sans text-sm font-medium text-ink-900">
                {DAY_LABELS[r.dayOfWeek]}
              </span>
            </label>

            {r.isActive ? (
              <div className="flex flex-1 items-center gap-2">
                <select
                  value={r.startTime}
                  onChange={(e) => update(r.dayOfWeek, { startTime: e.target.value })}
                  className="h-9 px-3 text-sm font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
                <span className="font-sans text-sm text-ink-500">to</span>
                <select
                  value={r.endTime}
                  onChange={(e) => update(r.dayOfWeek, { endTime: e.target.value })}
                  className="h-9 px-3 text-sm font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
                >
                  {TIME_OPTIONS.map((t) => (
                    <option key={t} value={t}>{formatTimeLabel(t)}</option>
                  ))}
                </select>
                {r.startTime >= r.endTime && (
                  <span className="text-xs font-sans text-error">End must be after start</span>
                )}
              </div>
            ) : (
              <span className="font-sans text-sm text-ink-400">Closed</span>
            )}
          </div>
        ))}
      </div>

      <p className="text-xs font-sans text-ink-500">
        Time zone uses your provider settings (defaults to Eastern). You can refine these and add time-off later from the dashboard.
      </p>

      {submitError && (
        <p className="text-sm font-sans text-error" role="alert">{submitError}</p>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!canContinue}
          aria-label="Continue to review"
        >
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
