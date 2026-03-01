"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import CalendarGrid from "./CalendarGrid";
import MiniCalendar from "./MiniCalendar";
import BlockTimeModal from "./BlockTimeModal";

// ─── Types ───────────────────────────────────────────────

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  client: { firstName: string; lastName: string | null } | null;
  clientName: string | null;
  service: { name: string; durationMinutes: number };
};

type TimeOff = {
  id: string;
  startDate: string;
  endDate: string;
  reason: string | null;
};

type AvailabilityRule = {
  dayOfWeek: number;
  startTime: string;
  endTime: string;
  isActive: boolean;
};

// ─── Helpers ─────────────────────────────────────────────

function getMonday(d: Date): Date {
  const date = new Date(d);
  const day = date.getDay();
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  date.setHours(0, 0, 0, 0);
  return date;
}

function addDays(d: Date, n: number): Date {
  const date = new Date(d);
  date.setDate(date.getDate() + n);
  return date;
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

// ─── Skeleton ────────────────────────────────────────────

function CalendarSkeleton(): React.JSX.Element {
  return (
    <div className="flex-1 flex flex-col gap-grid-2 p-grid-3">
      {/* Header skeleton */}
      <div className="flex items-center justify-between">
        <div className="h-8 w-32 skeleton-shimmer rounded" />
        <div className="flex gap-2">
          <div className="h-8 w-24 skeleton-shimmer rounded" />
          <div className="h-8 w-20 skeleton-shimmer rounded" />
        </div>
      </div>
      {/* Grid skeleton */}
      <div className="flex-1 flex gap-px">
        <div className="w-14 space-y-[96px] pt-4">
          {Array.from({ length: 6 }, (_, i) => (
            <div key={i} className="h-3 w-10 skeleton-shimmer rounded" />
          ))}
        </div>
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="flex-1 space-y-2 pt-2">
            <div className="h-5 skeleton-shimmer rounded mx-1" />
            {Array.from({ length: 3 }, (_, j) => (
              <div
                key={j}
                className="h-16 skeleton-shimmer rounded mx-1"
                style={{ marginTop: `${j * 80 + 40}px` }}
              />
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Component ───────────────────────────────────────────

export default function CalendarClient(): React.JSX.Element {
  const [view, setView] = useState<"week" | "day">("week");
  const [currentDate, setCurrentDate] = useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [timeOffs, setTimeOffs] = useState<TimeOff[]>([]);
  const [rules, setRules] = useState<AvailabilityRule[]>([]);
  const [timezone, setTimezone] = useState("America/New_York");
  const [loading, setLoading] = useState(true);
  const [blockModal, setBlockModal] = useState<{ date: Date; hour: number } | null>(null);
  const [rescheduleConfirm, setRescheduleConfirm] = useState<{
    appointmentId: string;
    newStartTime: Date;
  } | null>(null);
  const [rescheduling, setRescheduling] = useState(false);

  // Compute date range for the current view
  const getDateRange = useCallback(() => {
    if (view === "week") {
      const monday = getMonday(currentDate);
      const sunday = addDays(monday, 7);
      return { startDate: monday.toISOString(), endDate: sunday.toISOString() };
    }
    const dayStart = new Date(currentDate);
    dayStart.setHours(0, 0, 0, 0);
    const dayEnd = addDays(dayStart, 1);
    return { startDate: dayStart.toISOString(), endDate: dayEnd.toISOString() };
  }, [currentDate, view]);

  // Fetch appointments for current date range
  const fetchAppointments = useCallback(async () => {
    const { startDate, endDate } = getDateRange();
    try {
      const res = await fetch(
        `/api/appointments?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`
      );
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.data || []);
      }
    } catch (e) {
      console.error("[calendar] Failed to fetch appointments:", e);
    }
  }, [getDateRange]);

  // Fetch time-offs and rules (once on mount)
  const fetchTimeOffs = useCallback(async () => {
    try {
      const res = await fetch("/api/availability/time-off");
      if (res.ok) {
        const json = await res.json();
        setTimeOffs(json.data || []);
      }
    } catch (e) {
      console.error("[calendar] Failed to fetch time-offs:", e);
    }
  }, []);

  const fetchRules = useCallback(async () => {
    try {
      const res = await fetch("/api/availability/rules");
      if (res.ok) {
        const json = await res.json();
        setRules(json.data || []);
      }
    } catch (e) {
      console.error("[calendar] Failed to fetch rules:", e);
    }
  }, []);

  // Fetch provider timezone
  const fetchTimezone = useCallback(async () => {
    try {
      const res = await fetch("/api/providers/me");
      if (res.ok) {
        const json = await res.json();
        if (json.data?.timezone) setTimezone(json.data.timezone);
      }
    } catch {
      // Use default
    }
  }, []);

  // Initial load
  useEffect(() => {
    setLoading(true);
    Promise.all([fetchAppointments(), fetchTimeOffs(), fetchRules(), fetchTimezone()]).finally(() =>
      setLoading(false)
    );
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Refetch appointments when date/view changes
  useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ─── Navigation ──────────────────────────────────────────

  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  }

  function goPrev() {
    setCurrentDate((prev) => addDays(prev, view === "week" ? -7 : -1));
  }

  function goNext() {
    setCurrentDate((prev) => addDays(prev, view === "week" ? 7 : 1));
  }

  function handleDateSelect(date: Date) {
    setCurrentDate(date);
  }

  // ─── Reschedule ──────────────────────────────────────────

  function handleRescheduleRequest(appointmentId: string, newStartTime: Date) {
    setRescheduleConfirm({ appointmentId, newStartTime });
  }

  async function confirmReschedule() {
    if (!rescheduleConfirm) return;
    setRescheduling(true);

    try {
      const res = await fetch(`/api/appointments/${rescheduleConfirm.appointmentId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          startTime: rescheduleConfirm.newStartTime.toISOString(),
        }),
      });

      if (res.ok) {
        await fetchAppointments();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to reschedule");
      }
    } catch {
      alert("Network error");
    } finally {
      setRescheduling(false);
      setRescheduleConfirm(null);
    }
  }

  // ─── Block Time ──────────────────────────────────────────

  function handleBlockTime(date: Date, hour: number) {
    setBlockModal({ date, hour });
  }

  async function handleBlockCreated() {
    setBlockModal(null);
    await fetchTimeOffs();
  }

  // ─── Build appointment date set for mini calendar ────────

  const appointmentDates = new Set<string>();
  for (const a of appointments) {
    appointmentDates.add(formatDateKey(new Date(a.startTime)));
  }

  // ─── Header title ────────────────────────────────────────

  let headerTitle: string;
  if (view === "day") {
    headerTitle = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  } else {
    const monday = getMonday(currentDate);
    const sunday = addDays(monday, 6);
    const sameMonth = monday.getMonth() === sunday.getMonth();
    if (sameMonth) {
      headerTitle = `${monday.toLocaleDateString("en-US", { month: "long" })} ${monday.getDate()} – ${sunday.getDate()}, ${monday.getFullYear()}`;
    } else {
      headerTitle = `${monday.toLocaleDateString("en-US", { month: "short" })} ${monday.getDate()} – ${sunday.toLocaleDateString("en-US", { month: "short" })} ${sunday.getDate()}, ${sunday.getFullYear()}`;
    }
  }

  if (loading) {
    return (
      <div className="animate-fade-in-up">
        <h1 className="font-display text-2xl text-text-primary px-grid-3 pt-grid-3 pb-grid-2">
          Calendar
        </h1>
        <CalendarSkeleton />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full animate-fade-in-up">
      {/* Header */}
      <div className="px-grid-3 pt-grid-3 pb-grid-2 space-y-grid-2">
        <h1 className="font-display text-2xl text-text-primary">Calendar</h1>

        <div className="flex flex-col sm:flex-row sm:items-center gap-grid-2">
          {/* Mini calendar (desktop) */}
          <div className="hidden lg:block">
            <MiniCalendar
              currentDate={currentDate}
              onDateSelect={handleDateSelect}
              appointmentDates={appointmentDates}
            />
          </div>

          <div className="flex-1 flex flex-col sm:flex-row sm:items-center gap-2">
            {/* Date nav */}
            <div className="flex items-center gap-2">
              <button
                onClick={goPrev}
                className="p-2 rounded-button border border-border hover:bg-surface-alt transition-colors"
              >
                <ChevronLeft size={16} />
              </button>
              <button
                onClick={goToday}
                className="px-3 py-1.5 text-sm font-medium rounded-button border border-border hover:bg-surface-alt transition-colors"
              >
                Today
              </button>
              <button
                onClick={goNext}
                className="p-2 rounded-button border border-border hover:bg-surface-alt transition-colors"
              >
                <ChevronRight size={16} />
              </button>
            </div>

            {/* Title */}
            <h2 className="text-sm font-medium text-text-primary flex-1">{headerTitle}</h2>

            {/* View toggle */}
            <div className="flex rounded-button border border-border overflow-hidden">
              <button
                onClick={() => setView("week")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors ${
                  view === "week"
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-surface-alt"
                }`}
              >
                Week
              </button>
              <button
                onClick={() => setView("day")}
                className={`px-3 py-1.5 text-xs font-medium transition-colors border-l border-border ${
                  view === "day"
                    ? "bg-primary text-white"
                    : "text-text-secondary hover:bg-surface-alt"
                }`}
              >
                Day
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Calendar grid */}
      <div className="flex-1 min-h-0 border-t border-border">
        <CalendarGrid
          view={view}
          currentDate={currentDate}
          appointments={appointments}
          timeOffs={timeOffs}
          availabilityRules={rules}
          timezone={timezone}
          onReschedule={handleRescheduleRequest}
          onBlockTime={handleBlockTime}
        />
      </div>

      {/* Block time modal */}
      {blockModal && (
        <BlockTimeModal
          initialDate={blockModal.date}
          initialHour={blockModal.hour}
          onClose={() => setBlockModal(null)}
          onCreated={handleBlockCreated}
        />
      )}

      {/* Reschedule confirmation dialog */}
      {rescheduleConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div
            className="absolute inset-0 bg-black/50"
            onClick={() => !rescheduling && setRescheduleConfirm(null)}
          />
          <div className="relative bg-surface rounded-card w-[90vw] max-w-sm mx-4 overflow-hidden animate-fade-in-up">
            <div className="px-grid-3 py-grid-3">
              <h3 className="font-display text-lg mb-2">Reschedule Appointment?</h3>
              <p className="text-sm text-text-secondary">
                Move this appointment to{" "}
                <span className="font-medium text-text-primary">
                  {rescheduleConfirm.newStartTime.toLocaleDateString("en-US", {
                    weekday: "short",
                    month: "short",
                    day: "numeric",
                  })}{" "}
                  at{" "}
                  {rescheduleConfirm.newStartTime.toLocaleTimeString("en-US", {
                    hour: "numeric",
                    minute: "2-digit",
                  })}
                </span>
                ?
              </p>
            </div>
            <div className="px-grid-3 py-grid-2 border-t border-border flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setRescheduleConfirm(null)}
                disabled={rescheduling}
                className="px-4 py-2 text-sm font-medium text-text-secondary rounded-button border border-border hover:bg-surface-alt transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmReschedule}
                disabled={rescheduling}
                className="px-4 py-2 text-sm font-medium text-white bg-primary rounded-button hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {rescheduling ? "Moving..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
