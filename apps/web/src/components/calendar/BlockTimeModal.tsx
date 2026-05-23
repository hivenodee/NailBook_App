"use client";

import React, { useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";

type BlockTimeModalProps = {
  initialDate: Date;
  initialHour: number;
  onClose: () => void;
  onCreated: () => void;
};

function formatDateInput(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function formatTimeInput(hour: number, minute: number = 0): string {
  return `${String(hour).padStart(2, "0")}:${String(minute).padStart(2, "0")}`;
}

const INPUT_CLASS =
  "w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50";

export default function BlockTimeModal({
  initialDate,
  initialHour,
  onClose,
  onCreated,
}: BlockTimeModalProps): React.JSX.Element {
  const [startDate, setStartDate] = useState(formatDateInput(initialDate));
  const [startTime, setStartTime] = useState(formatTimeInput(initialHour));
  const [endDate, setEndDate] = useState(formatDateInput(initialDate));
  const [endTime, setEndTime] = useState(formatTimeInput(Math.min(initialHour + 1, 23)));
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");
  const reduce = useReducedMotion();

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/availability/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: `${startDate}T${startTime}:00.000Z`,
          endDate: `${endDate}T${endTime}:00.000Z`,
          reason: reason.trim() || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setErrorMsg(data.error?.message || "Failed to create time block");
        return;
      }
      onCreated();
    } catch {
      setErrorMsg("Network error");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <motion.div
        className="absolute inset-0 bg-ink-900/50"
        onClick={onClose}
        aria-hidden="true"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: 1 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      />

      <motion.div
        className="relative rounded-md w-[90vw] max-w-md mx-4 overflow-hidden bg-cream-50 border border-ink-200 shadow-soft"
        initial={reduce ? false : { opacity: 0, scale: 0.96 }}
        animate={reduce ? undefined : { opacity: 1, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
      >
        <div className="px-6 py-4 border-b border-ink-100">
          <Heading variant="h4" className="text-xl">Block time</Heading>
          <p className="text-xs font-sans text-ink-500 mt-0.5">
            Create a time-off block on your calendar.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="px-6 py-5 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Start date">
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </Field>
            <Field label="Start time">
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </Field>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Field label="End date">
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </Field>
            <Field label="End time">
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className={INPUT_CLASS}
                required
              />
            </Field>
          </div>

          <Field label="Reason (optional)">
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Lunch break, personal"
              className={INPUT_CLASS}
            />
          </Field>

          {errorMsg && <p className="text-xs font-sans text-error">{errorMsg}</p>}

          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="ghost" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" disabled={saving}>
              {saving ? "Saving…" : "Block time"}
            </Button>
          </div>
        </form>
      </motion.div>
    </div>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-sans font-medium text-ink-700">{label}</label>
      {children}
    </div>
  );
}
