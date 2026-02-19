"use client";

import React, { useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────

type Channel = "EMAIL" | "SMS" | "PUSH";

type ReminderSetting = {
  id?: string;
  hoursBefore: number;
  channels: Channel[];
  enabled: boolean;
};

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "EMAIL", label: "Email" },
  { value: "SMS", label: "SMS" },
  { value: "PUSH", label: "Push" },
];

const INTERVAL_OPTIONS = [1, 2, 4, 6, 12, 24, 48];

// ─── Page Component ─────────────────────────────────

export default function RemindersPage(): React.JSX.Element {
  const [settings, setSettings] = useState<ReminderSetting[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const res = await fetch("/api/reminders/settings");
      const json = await res.json();
      setSettings(json.data?.settings || []);
    } catch (e) {
      console.error("Failed to load reminder settings:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadSettings();
  }, [loadSettings]);

  function toggleChannel(index: number, channel: Channel): void {
    setSettings((prev) =>
      prev.map((s, i) => {
        if (i !== index) return s;
        const has = s.channels.includes(channel);
        return {
          ...s,
          channels: has
            ? s.channels.filter((c) => c !== channel)
            : [...s.channels, channel],
        };
      })
    );
    setSaved(false);
    setSaveError(null);
  }

  function toggleEnabled(index: number): void {
    setSettings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, enabled: !s.enabled } : s))
    );
    setSaved(false);
    setSaveError(null);
  }

  function removeReminder(index: number): void {
    setSettings((prev) => prev.filter((_, i) => i !== index));
    setSaved(false);
    setSaveError(null);
  }

  function addReminder(): void {
    // Find next unused interval
    const usedHours = new Set(settings.map((s) => s.hoursBefore));
    const nextHour = INTERVAL_OPTIONS.find((h) => !usedHours.has(h)) ?? 1;
    setSettings((prev) => [
      ...prev,
      { hoursBefore: nextHour, channels: ["EMAIL"], enabled: true },
    ]);
    setSaved(false);
    setSaveError(null);
  }

  function updateHours(index: number, hours: number): void {
    setSettings((prev) =>
      prev.map((s, i) => (i === index ? { ...s, hoursBefore: hours } : s))
    );
    setSaved(false);
    setSaveError(null);
  }

  async function handleSave(): Promise<void> {
    setSaving(true);
    setSaved(false);
    setSaveError(null);
    try {
      const res = await fetch("/api/reminders/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error?.message || "Failed to save settings");
        return;
      }
      if (json.data?.settings) {
        setSettings(json.data.settings);
      }
      setSaved(true);
    } catch (e) {
      console.error("Failed to save reminder settings:", e);
      setSaveError("Network error — please try again");
    } finally {
      setSaving(false);
    }
  }

  // ─── Loading Skeleton ───────────────────────────────

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div>
          <div className="h-7 bg-border/60 rounded w-44 mb-2" />
          <div className="h-4 bg-border/40 rounded w-72" />
        </div>
        {[0, 1, 2].map((i) => (
          <div
            key={i}
            className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse"
          >
            <div className="flex justify-between items-start">
              <div className="space-y-2 flex-1">
                <div className="h-5 bg-border/60 rounded w-32" />
                <div className="flex gap-2">
                  <div className="h-7 bg-border/40 rounded-full w-16" />
                  <div className="h-7 bg-border/40 rounded-full w-14" />
                  <div className="h-7 bg-border/40 rounded-full w-14" />
                </div>
              </div>
              <div className="h-6 bg-border/40 rounded-full w-12" />
            </div>
          </div>
        ))}
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────

  return (
    <div className="space-y-grid-3">
      <div>
        <h1 className="text-2xl font-semibold">Reminder Settings</h1>
        <p className="text-text-secondary text-sm mt-1">
          Configure when and how your clients receive appointment reminders
        </p>
      </div>

      {/* Reminder cards */}
      {settings.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-border p-grid-4 text-center space-y-2">
          <p className="text-text-secondary text-sm font-medium">
            No reminders configured yet
          </p>
          <p className="text-text-muted text-xs">
            Set up automatic appointment reminders via email, SMS, or push
            notifications. Your clients will be notified before their
            appointments.
          </p>
          <button
            onClick={addReminder}
            className="mt-2 text-sm font-medium px-4 py-2 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors"
          >
            + Add Your First Reminder
          </button>
        </div>
      ) : (
      <div className="space-y-grid-2">
        {settings.map((setting, index) => (
          <div
            key={setting.id ?? index}
            className={`bg-surface rounded-card p-grid-2 shadow-card transition-opacity ${
              !setting.enabled ? "opacity-60" : ""
            }`}
          >
            <div className="flex justify-between items-start mb-grid-2">
              <div className="flex items-center gap-grid-1">
                {/* Hours selector */}
                <select
                  value={setting.hoursBefore}
                  onChange={(e) =>
                    updateHours(index, parseInt(e.target.value, 10))
                  }
                  className="border border-border rounded-button px-2 py-1 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {INTERVAL_OPTIONS.map((h) => (
                    <option key={h} value={h}>
                      {h >= 24 ? `${h / 24} day${h >= 48 ? "s" : ""}` : `${h} hour${h > 1 ? "s" : ""}`}
                    </option>
                  ))}
                </select>
                <span className="text-sm text-text-secondary">before</span>
              </div>

              <div className="flex items-center gap-2">
                {/* Enable/disable toggle */}
                <button
                  onClick={() => toggleEnabled(index)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    setting.enabled ? "bg-primary" : "bg-border"
                  }`}
                  aria-label={setting.enabled ? "Disable reminder" : "Enable reminder"}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      setting.enabled ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>

                {/* Delete button (only non-default) */}
                {settings.length > 1 && (
                  <button
                    onClick={() => removeReminder(index)}
                    className="text-text-muted hover:text-status-error text-sm transition-colors p-1"
                    aria-label="Remove reminder"
                  >
                    <svg
                      width="16"
                      height="16"
                      viewBox="0 0 16 16"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    >
                      <path d="M4 4l8 8M12 4l-8 8" />
                    </svg>
                  </button>
                )}
              </div>
            </div>

            {/* Channel toggles */}
            <div className="flex gap-2">
              {CHANNELS.map((ch) => {
                const active = setting.channels.includes(ch.value);
                return (
                  <button
                    key={ch.value}
                    onClick={() => toggleChannel(index, ch.value)}
                    className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                      active
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                    }`}
                  >
                    {ch.label}
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
      )}

      {/* Add reminder button */}
      {settings.length > 0 && settings.length < INTERVAL_OPTIONS.length && (
        <button
          onClick={addReminder}
          className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary transition-colors"
        >
          + Add Reminder
        </button>
      )}

      {/* Error feedback */}
      {saveError && (
        <div className="bg-red-50 text-red-700 text-sm px-4 py-3 rounded-card border border-red-200">
          {saveError}
        </div>
      )}

      {/* Save button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="bg-primary text-white py-2.5 px-6 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      >
        {saving ? "Saving..." : saved ? "Saved ✓" : "Save Changes"}
      </button>
    </div>
  );
}
