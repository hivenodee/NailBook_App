"use client";

import React, { useState } from "react";

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
      {/* Scrim */}
      <div className="absolute inset-0 bg-black/50" onClick={onClose} />

      {/* Modal */}
      <div className="relative bg-surface rounded-card w-[90vw] max-w-md mx-4 overflow-hidden animate-fade-in-up">
        <div className="px-grid-3 py-grid-2 border-b border-border">
          <h3 className="font-display text-lg">Block Time</h3>
          <p className="text-xs text-text-muted">Create a time-off block on your calendar</p>
        </div>

        <form onSubmit={handleSubmit} className="px-grid-3 py-grid-3 space-y-grid-2">
          {/* Start */}
          <div className="grid grid-cols-2 gap-grid-2">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-input bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                Start Time
              </label>
              <input
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-input bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* End */}
          <div className="grid grid-cols-2 gap-grid-2">
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-input bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-text-secondary mb-1">
                End Time
              </label>
              <input
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-border rounded-input bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                required
              />
            </div>
          </div>

          {/* Reason */}
          <div>
            <label className="block text-xs font-medium text-text-secondary mb-1">
              Reason (optional)
            </label>
            <input
              type="text"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g., Lunch break, Personal"
              className="w-full px-3 py-2 text-sm border border-border rounded-input bg-background text-text-primary placeholder:text-text-muted focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {errorMsg && (
            <p className="text-xs text-status-error">{errorMsg}</p>
          )}

          {/* Actions */}
          <div className="flex justify-end gap-2 pt-grid-1">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-text-secondary rounded-button border border-border hover:bg-surface-alt transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-button hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {saving ? "Saving..." : "Block Time"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
