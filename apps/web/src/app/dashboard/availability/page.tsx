"use client";

import * as React from "react";
import { Plus, Trash2 } from "lucide-react";
import { DAYS_OF_WEEK } from "@nailbook/shared";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Heading } from "@/components/ui/Heading";
import { Input } from "@/components/ui/Input";
import { SectionRule } from "@/components/ui/SectionRule";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

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

// ─── Helpers ───────────────────────────────────────────────

function formatTime12(time: string): string {
  if (!time) return "";
  const [h, m] = time.split(":").map(Number);
  const period = h >= 12 ? "pm" : "am";
  const hour = h % 12 || 12;
  return `${hour}:${String(m).padStart(2, "0")}${period}`;
}

function formatDateRange(start: string, end: string): string {
  const s = new Date(start);
  const e = new Date(end);
  const opts: Intl.DateTimeFormatOptions = {
    month: "short",
    day: "numeric",
    year: "numeric",
  };
  if (s.toDateString() === e.toDateString()) {
    return s.toLocaleDateString("en-US", opts);
  }
  return `${s.toLocaleDateString("en-US", opts)} – ${e.toLocaleDateString("en-US", opts)}`;
}

// ─── Page ──────────────────────────────────────────────────

export default function HoursPage(): React.JSX.Element {
  const [rules, setRules] = React.useState<Rule[]>(() =>
    Array.from({ length: 7 }, (_, i) => ({
      dayOfWeek: i,
      startTime: DEFAULT_START,
      endTime: DEFAULT_END,
      isActive: false,
    })),
  );
  const [timeOffs, setTimeOffs] = React.useState<TimeOffEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [saving, setSaving] = React.useState(false);
  const [saved, setSaved] = React.useState(false);

  // Override form
  const [showOverrideForm, setShowOverrideForm] = React.useState(false);
  const [toStartDate, setToStartDate] = React.useState("");
  const [toEndDate, setToEndDate] = React.useState("");
  const [toReason, setToReason] = React.useState("");
  const [addingOverride, setAddingOverride] = React.useState(false);
  const [overrideError, setOverrideError] = React.useState<string | null>(null);

  // Copy-to popover (which day's popover is open)
  const [copyOpenForDay, setCopyOpenForDay] = React.useState<number | null>(null);

  const loadRules = React.useCallback(async () => {
    try {
      const res = await fetch("/api/availability/rules");
      const json = await res.json();
      if (json.data) {
        const existing: Rule[] = json.data;
        setRules(
          Array.from({ length: 7 }, (_, i) => {
            const found = existing.find((r) => r.dayOfWeek === i);
            return found
              ? { ...found }
              : {
                  dayOfWeek: i,
                  startTime: DEFAULT_START,
                  endTime: DEFAULT_END,
                  isActive: false,
                };
          }),
        );
      }
    } catch (e) {
      console.error("Failed to load rules:", e);
    }
  }, []);

  const loadTimeOffs = React.useCallback(async () => {
    try {
      const res = await fetch("/api/availability/time-off");
      const json = await res.json();
      setTimeOffs(json.data || []);
    } catch (e) {
      console.error("Failed to load time-off:", e);
    }
  }, []);

  React.useEffect(() => {
    async function init() {
      await Promise.all([loadRules(), loadTimeOffs()]);
      setLoading(false);
    }
    init();
  }, [loadRules, loadTimeOffs]);

  // Close copy popover on escape / outside click
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setCopyOpenForDay(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function updateRule(dayOfWeek: number, updates: Partial<Rule>) {
    setRules((prev) =>
      prev.map((r) => (r.dayOfWeek === dayOfWeek ? { ...r, ...updates } : r)),
    );
  }

  function copyHoursTo(sourceDay: number, targetDays: number[]) {
    const source = rules.find((r) => r.dayOfWeek === sourceDay);
    if (!source) return;
    setRules((prev) =>
      prev.map((r) =>
        targetDays.includes(r.dayOfWeek)
          ? {
              ...r,
              startTime: source.startTime,
              endTime: source.endTime,
              isActive: source.isActive,
            }
          : r,
      ),
    );
    setCopyOpenForDay(null);
  }

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
        alert(json.error?.message || "Couldn't save those hours.");
      }
    } catch {
      alert("Couldn't save those hours. Try again.");
    } finally {
      setSaving(false);
    }
  }

  async function addOverride() {
    if (!toStartDate || !toEndDate) return;
    setAddingOverride(true);
    setOverrideError(null);
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
        setShowOverrideForm(false);
        await loadTimeOffs();
      } else {
        const json = await res.json();
        setOverrideError(json.error?.message || "Couldn't add that override.");
      }
    } catch {
      setOverrideError("Couldn't add that override. Try again.");
    } finally {
      setAddingOverride(false);
    }
  }

  async function deleteOverride(id: string) {
    if (!confirm("Remove this override?")) return;
    try {
      await fetch(`/api/availability/time-off/${id}`, { method: "DELETE" });
      await loadTimeOffs();
    } catch (e) {
      console.error("Failed to delete time off:", e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-12">
        <header className="space-y-3">
          <p className="text-label text-ink-500">Hours &middot; Schedule &amp; time off</p>
          <Heading variant="display" className="text-3xl md:text-4xl">
            Hours
          </Heading>
          <p className="font-sans text-sm text-ink-500">
            Set your weekly hours and block off time when you need it.
          </p>
        </header>
        <div className="space-y-3">
          {[1, 2, 3, 4, 5, 6, 7].map((i) => (
            <div
              key={i}
              className="h-14 rounded-md skeleton-shimmer bg-cream-100"
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12">
      {/* ─── Header ─── */}
      <header className="space-y-3">
        <p className="text-label text-ink-500">Hours &middot; Schedule &amp; time off</p>
        <Heading variant="display" className="text-3xl md:text-4xl">
          Hours
        </Heading>
        <p className="font-sans text-sm text-ink-500">
          Set your weekly hours and block off time when you need it.
        </p>
      </header>

      {/* ─── Section 1: Weekly hours ─── */}
      <section className="space-y-6">
        <SectionRule label="Weekly hours" />

        <Card padding="sm" className="divide-y divide-ink-200">
          {rules.map((rule) => (
            <DayRow
              key={rule.dayOfWeek}
              rule={rule}
              copyOpen={copyOpenForDay === rule.dayOfWeek}
              onToggleCopy={() =>
                setCopyOpenForDay((id) =>
                  id === rule.dayOfWeek ? null : rule.dayOfWeek,
                )
              }
              onCloseCopy={() => setCopyOpenForDay(null)}
              onCopyTo={(targets) => copyHoursTo(rule.dayOfWeek, targets)}
              onUpdate={(updates) => updateRule(rule.dayOfWeek, updates)}
            />
          ))}
        </Card>

        <div className="flex items-center justify-end gap-3">
          {saved && (
            <span className="font-sans text-sm text-rust-500">Saved</span>
          )}
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={saveRules}
            disabled={saving}
          >
            {saving ? "Saving…" : "Save hours"}
          </Button>
        </div>
      </section>

      {/* ─── Section 2: Date overrides ─── */}
      <section className="space-y-6">
        <SectionRule label="Date overrides" />

        <div className="flex flex-wrap items-end justify-between gap-4">
          <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
            Block off dates for a holiday or vacation. Special hours are coming
            soon. For now, overrides close the date entirely.
          </p>

          {!showOverrideForm && (
            <Button
              type="button"
              variant="secondary"
              size="md"
              onClick={() => setShowOverrideForm(true)}
              className="gap-2"
            >
              <Plus size={16} strokeWidth={1.75} />
              Add override
            </Button>
          )}
        </div>

        {/* New override inline form */}
        {showOverrideForm && (
          <Card padding="md" className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                type="date"
                label="Start date"
                value={toStartDate}
                onChange={(e) => setToStartDate(e.target.value)}
                min={new Date().toISOString().split("T")[0]}
              />
              <Input
                type="date"
                label="End date"
                value={toEndDate}
                onChange={(e) => setToEndDate(e.target.value)}
                min={toStartDate || new Date().toISOString().split("T")[0]}
              />
            </div>
            <Input
              label="Reason"
              value={toReason}
              onChange={(e) => setToReason(e.target.value)}
              placeholder="Vacation, holiday, personal"
              helper="Optional. Visible only to you."
              maxLength={200}
            />
            {overrideError && (
              <p className="font-sans text-sm text-error" role="alert">
                {overrideError}
              </p>
            )}
            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                type="button"
                variant="ghost"
                size="md"
                onClick={() => {
                  setShowOverrideForm(false);
                  setOverrideError(null);
                }}
                disabled={addingOverride}
              >
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="md"
                onClick={addOverride}
                disabled={!toStartDate || !toEndDate || addingOverride}
              >
                {addingOverride ? "Adding…" : "Add override"}
              </Button>
            </div>
          </Card>
        )}

        {/* Existing overrides */}
        {timeOffs.length === 0 ? (
          <p className="font-sans text-sm text-ink-500">
            No date overrides set.
          </p>
        ) : (
          <ul className="space-y-2">
            {timeOffs.map((to) => (
              <li key={to.id}>
                <Card padding="sm" className="flex items-center justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-sans text-base text-ink-900">
                      {formatDateRange(to.startDate, to.endDate)}
                    </p>
                    <p className="mt-0.5 font-sans text-sm text-ink-500">
                      Closed
                      {to.reason && (
                        <>
                          <span className="mx-1.5 text-ink-300">·</span>
                          {to.reason}
                        </>
                      )}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => deleteOverride(to.id)}
                    aria-label="Remove override"
                    className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink-500 transition-colors hover:bg-error/5 hover:text-error focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                  >
                    <Trash2 size={16} strokeWidth={1.75} />
                  </button>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}

// ─── Day row ───────────────────────────────────────────────

function DayRow({
  rule,
  copyOpen,
  onToggleCopy,
  onCloseCopy,
  onCopyTo,
  onUpdate,
}: {
  rule: Rule;
  copyOpen: boolean;
  onToggleCopy: () => void;
  onCloseCopy: () => void;
  onCopyTo: (targets: number[]) => void;
  onUpdate: (updates: Partial<Rule>) => void;
}): React.JSX.Element {
  const dayName = DAYS_OF_WEEK[rule.dayOfWeek];

  return (
    <div className="group relative flex flex-wrap items-center gap-x-4 gap-y-3 py-3.5">
      {/* Day name */}
      <span className="font-sans text-base text-ink-900 w-24 shrink-0">
        {dayName}
      </span>

      {/* Toggle */}
      <ToggleSwitch
        checked={rule.isActive}
        onClick={() => onUpdate({ isActive: !rule.isActive })}
        ariaLabel={`${rule.isActive ? "Close" : "Open"} ${dayName}`}
      />

      {/* Times or Closed */}
      <div className="flex-1 min-w-0">
        {rule.isActive ? (
          <div className="flex items-center gap-2 flex-wrap">
            <Input
              type="time"
              value={rule.startTime}
              onChange={(e) => onUpdate({ startTime: e.target.value })}
              className="h-9 w-32"
              aria-label={`${dayName} start time`}
            />
            <span className="font-sans text-sm text-ink-500">to</span>
            <Input
              type="time"
              value={rule.endTime}
              onChange={(e) => onUpdate({ endTime: e.target.value })}
              className="h-9 w-32"
              aria-label={`${dayName} end time`}
            />
            <span className="font-sans text-xs text-ink-300 hidden sm:inline">
              {formatTime12(rule.startTime)} – {formatTime12(rule.endTime)}
            </span>
          </div>
        ) : (
          <span className="font-sans text-sm text-ink-300">Closed</span>
        )}
      </div>

      {/* Copy-to action */}
      <div className="relative shrink-0">
        <button
          type="button"
          onClick={onToggleCopy}
          className={cn(
            "font-sans text-xs uppercase tracking-wide text-ink-500 hover:text-rust-500 transition-colors focus-visible:outline-none focus-visible:text-rust-500",
            // Visible on mobile always; reveal on hover at md+
            "md:opacity-0 md:group-hover:opacity-100 md:focus-visible:opacity-100",
            copyOpen && "md:opacity-100 text-rust-500",
          )}
          aria-haspopup="menu"
          aria-expanded={copyOpen}
        >
          Copy to…
        </button>

        {copyOpen && (
          <CopyPopover
            sourceDay={rule.dayOfWeek}
            onCopy={onCopyTo}
            onClose={onCloseCopy}
          />
        )}
      </div>
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────

function ToggleSwitch({
  checked,
  onClick,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-pill transition-colors duration-200 shrink-0",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        checked ? "bg-rust-500" : "bg-cream-100 border border-ink-300",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 rounded-pill bg-cream-50 transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ─── Copy-to popover ──────────────────────────────────────

function CopyPopover({
  sourceDay,
  onCopy,
  onClose,
}: {
  sourceDay: number;
  onCopy: (targets: number[]) => void;
  onClose: () => void;
}): React.JSX.Element {
  // 0 = Sunday in the existing schema (matches DAYS_OF_WEEK ordering).
  const allOther = [0, 1, 2, 3, 4, 5, 6].filter((d) => d !== sourceDay);
  const weekdays = [1, 2, 3, 4, 5].filter((d) => d !== sourceDay);
  const weekend = [0, 6].filter((d) => d !== sourceDay);

  return (
    <>
      <div
        className="fixed inset-0 z-30"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="menu"
        className="absolute right-0 top-full z-40 mt-2 w-48 rounded-md border border-ink-200 bg-cream-50 p-1.5 shadow-elevated"
      >
        <PopoverRow
          label="All other days"
          onClick={() => onCopy(allOther)}
        />
        {weekdays.length > 0 && (
          <PopoverRow
            label="Weekdays"
            onClick={() => onCopy(weekdays)}
          />
        )}
        {weekend.length > 0 && (
          <PopoverRow
            label="Weekend"
            onClick={() => onCopy(weekend)}
          />
        )}
      </div>
    </>
  );
}

function PopoverRow({
  label,
  onClick,
}: {
  label: string;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="menuitem"
      onClick={onClick}
      className="block w-full rounded-md px-3 py-2 text-left font-sans text-sm text-ink-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:bg-cream-100"
    >
      {label}
    </button>
  );
}
