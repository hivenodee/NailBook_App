"use client";

import React, { useEffect, useState, useCallback } from "react";
import { DAYS_OF_WEEK } from "@nailbook/shared";

type Rule = {
  id?: string;
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

type TimeOffEntry = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

const DEFAULT_START = "09:00";
const DEFAULT_END = "17:00";

function generateTimeOptions() {
  const options: string[] = [];
  for (let h = 6; h <= 23; h++) {
    for (let m = 0; m < 60; m += 15) {
      options.push(`${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`);
    }
  }
  return options;
}

const TIME_OPTIONS = generateTimeOptions();

function formatTime12(time: string) {
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "PM" : "AM";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")} ${period}`;
}

function formatDateRange(start: string, end: string) {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = { month: "short", day: "numeric", year: "numeric" };
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

export default function AvailabilityPage() {
  const [rules, setRules] = useState<Rule[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      isActive: false,
    }))
  );
  const [timeOffs, setTimeOffs] = useState<TimeOffEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  // Time-off form state
  const [toStartDate, setToStartDate] = useState("");
  const [toEndDate, setToEndDate] = useState("");
  const [toReason, setToReason] = useState("");
  const [addingTimeOff, setAddingTimeOff] = useState(false);

  const loadRules = useCallback(async () => {
    try {
      const res = await fetch("/api/availability/rules");
      const json = await res.json();
      if (json.data) {
        const existing: Rule[] = json.data;
        // Merge with defaults — fill in days that have no rule
        setRules(
          Array.from({ length: 7 }, (_, i) => {
            const found = existing.find((r) => r.dayOfWeek === i);
            return found
              ? { ...found }
              : { dayOfWeek: i, startTime: DEFAULT_START, endTime: DEFAULT_END, isActive: false };
          })
        );
      }
    } catch (e) {
      console.error("Failed to load rules:", e);
    }
  }, []);

  const loadTimeOffs = useCallback(async () => {
    try {
      const res = await fetch("/api/availability/time-off");
      const json = await res.json();
      setTimeOffs(json.data || []);
    } catch (e) {
      console.error("Failed to load time-off:", e);
    }
  }, []);

  useEffect(() => {
    async function init() {
      await Promise.all([loadRules(), loadTimeOffs()]);
      setLoading(false);
    }
    init();
  }, [loadRules, loadTimeOffs]);

  async function saveRules() {
    setSaving(true);
    setSaved(false);
    try {
      const res = await fetch("/api/availability/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(rules),
      });
      if (res.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 3000);
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to save");
      }
    } catch (e) {
      console.error("Failed to save rules:", e);
      alert("Failed to save. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  async function addTimeOff() {
    if (!toStartDate || !toEndDate) return;
    setAddingTimeOff(true);
    try {
      const res = await fetch("/api/availability/time-off", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          startDate: new Date(toStartDate + "T00:00:00Z").toISOString(),
          endDate: new Date(toEndDate + "T23:59:59Z").toISOString(),
          reason: toReason || undefined,
        }),
      });
      if (res.ok) {
        setToStartDate("");
        setToEndDate("");
        setToReason("");
        await loadTimeOffs();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to add time off");
      }
    } catch (e) {
      console.error("Failed to add time off:", e);
      alert("Failed to add time off. Please try again.");
    } finally {
      setAddingTimeOff(false);
    }
  }

  async function deleteTimeOff(id: string) {
    if (!confirm("Remove this time off?")) return;
    try {
      await fetch(`/api/availability/time-off/${id}`, { method: "DELETE" });
      await loadTimeOffs();
    } catch (e) {
      console.error("Failed to delete time off:", e);
    }
  }

  function updateRule(dayOfWeek: number, updates: Partial<Rule>) {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...updates } : r))
    );
  }

  if (loading) {
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Availability</h1>

      {/* Section A: Weekly Hours */}
      <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-4">
        <h2 className="text-lg font-medium">Weekly Hours</h2>

        <div className="space-y-3">
          {rules.map((rule) => (
            <div key={rule.dayOfWeek} className="flex items-center gap-3">
              {/* Day toggle */}
              <button
                type="button"
                onClick={() => updateRule(rule.dayOfWeek, { isActive: !rule.isActive })}
                className={`w-20 text-center text-sm font-medium py-1.5 rounded-button transition-colors ${
                  rule.isActive
                    ? "bg-primary text-white"
                    : "bg-gray-100 text-text-muted"
                }`}
              >
                {DAYS_OF_WEEK[rule.dayOfWeek].slice(0, 3)}
              </button>

              {rule.isActive ? (
                <div className="flex items-center gap-2 flex-1">
                  <select
                    value={rule.startTime}
                    onChange={(e) => updateRule(rule.dayOfWeek, { startTime: e.target.value })}
                    className="text-sm border border-border rounded-button px-2 py-1.5 bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTime12(t)}
                      </option>
                    ))}
                  </select>
                  <span className="text-text-muted text-sm">to</span>
                  <select
                    value={rule.endTime}
                    onChange={(e) => updateRule(rule.dayOfWeek, { endTime: e.target.value })}
                    className="text-sm border border-border rounded-button px-2 py-1.5 bg-white"
                  >
                    {TIME_OPTIONS.map((t) => (
                      <option key={t} value={t}>
                        {formatTime12(t)}
                      </option>
                    ))}
                  </select>
                </div>
              ) : (
                <span className="text-sm text-text-muted">Closed</span>
              )}
            </div>
          ))}
        </div>

        <button
          onClick={saveRules}
          disabled={saving}
          className="w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : saved ? "Saved" : "Save Hours"}
        </button>
      </div>

      {/* Section B: Time Off */}
      <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-4">
        <h2 className="text-lg font-medium">Time Off</h2>

        {/* Existing time-off entries */}
        {timeOffs.length > 0 ? (
          <div className="space-y-2">
            {timeOffs.map((to) => (
              <div
                key={to.id}
                className="flex items-center justify-between border border-border rounded-button px-3 py-2"
              >
                <div>
                  <p className="text-sm font-medium">
                    {formatDateRange(to.startDate, to.endDate)}
                  </p>
                  {to.reason && (
                    <p className="text-xs text-text-muted">{to.reason}</p>
                  )}
                </div>
                <button
                  onClick={() => deleteTimeOff(to.id)}
                  className="text-xs font-medium text-red-600 hover:text-red-700 transition-colors"
                >
                  Remove
                </button>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted">No upcoming time off scheduled.</p>
        )}

        {/* Add time-off form */}
        <div className="border-t border-border pt-4 space-y-3">
          <h3 className="text-sm font-medium">Add Time Off</h3>
          <div className="flex gap-2">
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">Start Date</label>
              <input
                type="date"
                value={toStartDate}
                onChange={(e) => setToStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
                className="w-full text-sm border border-border rounded-button px-2 py-1.5"
              />
            </div>
            <div className="flex-1">
              <label className="block text-xs text-text-muted mb-1">End Date</label>
              <input
                type="date"
                value={toEndDate}
                onChange={(e) => setToEndDate(e.target.value)}
                min={toStartDate || new Date().toISOString().split("T")[0]}
                className="w-full text-sm border border-border rounded-button px-2 py-1.5"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-text-muted mb-1">Reason (optional)</label>
            <input
              type="text"
              value={toReason}
              onChange={(e) => setToReason(e.target.value)}
              placeholder="e.g. Vacation, Personal"
              maxLength={200}
              className="w-full text-sm border border-border rounded-button px-2 py-1.5"
            />
          </div>
          <button
            onClick={addTimeOff}
            disabled={!toStartDate || !toEndDate || addingTimeOff}
            className="w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {addingTimeOff ? "Adding..." : "Add Time Off"}
          </button>
        </div>
      </div>
    </div>
  );
}
