"use client";

import * as React from "react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { toDateStr } from "./helpers";
import type { TimeSlot, WaitlistTimePref } from "./types";

export type WaitlistFormProps = {
  serviceId: string | null;
  selectedDate: Date;
  /** Per-slot waitlist when set; otherwise day-level. */
  waitlistSlot: TimeSlot | null;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  phone: string;
  setPhone: (v: string) => void;
  timePref: WaitlistTimePref;
  setTimePref: (v: WaitlistTimePref) => void;
  submitting: boolean;
  setSubmitting: (v: boolean) => void;
  onSuccess: () => void;
};

export function WaitlistForm({
  serviceId,
  selectedDate,
  waitlistSlot,
  name,
  setName,
  email,
  setEmail,
  phone,
  setPhone,
  timePref,
  setTimePref,
  submitting,
  setSubmitting,
  onSuccess,
}: WaitlistFormProps): React.JSX.Element {
  const [error, setError] = React.useState<string | null>(null);

  async function handleSubmit() {
    if (!serviceId) return;
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          targetDate: toDateStr(selectedDate),
          ...(waitlistSlot ? { targetTime: waitlistSlot.startTime } : {}),
          timePreference: timePref,
          clientName: name,
          clientEmail: email,
          clientPhone: phone || undefined,
        }),
      });
      if (res.ok) {
        onSuccess();
      } else {
        const json = await res.json();
        setError(json.error?.message || "Couldn't join the waitlist.");
      }
    } catch {
      setError("Something went wrong. Try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="mt-4 space-y-4 text-left">
      <Input
        label="Name"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        autoComplete="name"
      />
      <Input
        label="Email"
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="you@example.com"
        autoComplete="email"
      />
      <Input
        label="Phone"
        type="tel"
        value={phone}
        onChange={(e) => setPhone(e.target.value)}
        placeholder="(555) 123 4567"
        helper="Optional"
        autoComplete="tel"
      />
      {!waitlistSlot && (
        <div className="space-y-1.5">
          <label
            htmlFor="waitlist-time-pref"
            className="font-sans text-sm font-medium text-ink-700"
          >
            Time preference
          </label>
          <select
            id="waitlist-time-pref"
            value={timePref}
            onChange={(e) => setTimePref(e.target.value as WaitlistTimePref)}
            className="h-11 w-full rounded-md border border-ink-300 bg-cream-50 px-3 font-sans text-base text-ink-900 transition-colors hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <option value="ANY">Any time</option>
            <option value="MORNING">Morning (before 12pm)</option>
            <option value="AFTERNOON">Afternoon (12 to 5pm)</option>
            <option value="EVENING">Evening (after 5pm)</option>
          </select>
        </div>
      )}
      {error && (
        <p className="font-sans text-xs text-error" role="alert">
          {error}
        </p>
      )}
      <Button
        type="button"
        variant="primary"
        size="md"
        disabled={!name || !email || submitting}
        onClick={handleSubmit}
        className="w-full"
      >
        {submitting ? "Joining…" : "Join waitlist"}
      </Button>
    </div>
  );
}
