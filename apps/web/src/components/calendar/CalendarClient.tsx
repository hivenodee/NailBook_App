"use client";

import * as React from "react";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { EmptyState } from "@/components/ui/EmptyState";
import CalendarGrid from "./CalendarGrid";
import { CalendarMonth } from "./CalendarMonth";
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

type CalendarView = "day" | "week" | "month";

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

function addMonths(d: Date, n: number): Date {
  const date = new Date(d);
  date.setMonth(date.getMonth() + n);
  return date;
}

function formatDateKey(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function getClientFullName(a: Appointment): string {
  if (a.client?.firstName) {
    return `${a.client.firstName}${a.client.lastName ? ` ${a.client.lastName}` : ""}`;
  }
  return a.clientName || "Client";
}

// ─── Component ───────────────────────────────────────────

export default function CalendarClient(): React.JSX.Element {
  const [view, setView] = React.useState<CalendarView>(() => {
    if (typeof window !== "undefined" && window.innerWidth < 1024) return "day";
    return "week";
  });
  const [currentDate, setCurrentDate] = React.useState(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  });
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [timeOffs, setTimeOffs] = React.useState<TimeOff[]>([]);
  const [rules, setRules] = React.useState<AvailabilityRule[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [blockModal, setBlockModal] = React.useState<{
    date: Date;
    hour: number;
  } | null>(null);
  const [rescheduleConfirm, setRescheduleConfirm] = React.useState<{
    appointmentId: string;
    newStartTime: Date;
  } | null>(null);
  const [rescheduling, setRescheduling] = React.useState(false);

  // Filter UI
  const [filterOpen, setFilterOpen] = React.useState(false);
  const [serviceFilter, setServiceFilter] = React.useState<Set<string>>(new Set());
  const [clientFilter, setClientFilter] = React.useState<Set<string>>(new Set());

  // ─── Date range for current view ─────────────────────

  const getDateRange = React.useCallback(() => {
    if (view === "month") {
      const first = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
      const last = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
      return { startDate: first.toISOString(), endDate: last.toISOString() };
    }
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

  // ─── Fetches ────────────────────────────────────────

  const fetchAppointments = React.useCallback(async () => {
    const { startDate, endDate } = getDateRange();
    try {
      const res = await fetch(
        `/api/appointments?startDate=${encodeURIComponent(startDate)}&endDate=${encodeURIComponent(endDate)}`,
      );
      if (res.ok) {
        const json = await res.json();
        setAppointments(json.data || []);
      }
    } catch (e) {
      console.error("[calendar] Failed to fetch appointments:", e);
    }
  }, [getDateRange]);

  const fetchTimeOffs = React.useCallback(async () => {
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

  const fetchRules = React.useCallback(async () => {
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

  React.useEffect(() => {
    setLoading(true);
    Promise.all([fetchAppointments(), fetchTimeOffs(), fetchRules()]).finally(
      () => setLoading(false),
    );
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  React.useEffect(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  // ─── Navigation ────────────────────────────────────────

  function goToday() {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    setCurrentDate(d);
  }
  function goPrev() {
    setCurrentDate((prev) => {
      if (view === "month") return addMonths(prev, -1);
      return addDays(prev, view === "week" ? -7 : -1);
    });
  }
  function goNext() {
    setCurrentDate((prev) => {
      if (view === "month") return addMonths(prev, 1);
      return addDays(prev, view === "week" ? 7 : 1);
    });
  }
  function handleDateSelect(date: Date) {
    setCurrentDate(date);
  }

  function handleMonthDayClick(date: Date) {
    setCurrentDate(date);
    setView("day");
  }

  // ─── Touch swipe (mobile day view) ────────────────────

  const touchStartX = React.useRef<number | null>(null);
  const touchStartY = React.useRef<number | null>(null);
  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
    touchStartY.current = e.touches[0].clientY;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null || touchStartY.current === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX.current;
    const dy = e.changedTouches[0].clientY - touchStartY.current;
    touchStartX.current = null;
    touchStartY.current = null;
    // Only trigger horizontal swipes; ignore vertical scrolling.
    if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) {
      if (dx < 0) goNext();
      else goPrev();
    }
  }

  // ─── Reschedule ───────────────────────────────────────

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

  // ─── Block time ───────────────────────────────────────

  function handleBlockTime(date: Date, hour: number) {
    setBlockModal({ date, hour });
  }
  async function handleBlockCreated() {
    setBlockModal(null);
    await fetchTimeOffs();
  }

  // ─── Filter computation ──────────────────────────────

  const allServiceNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(a.service.name);
    return Array.from(set).sort();
  }, [appointments]);

  const allClientNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const a of appointments) set.add(getClientFullName(a));
    return Array.from(set).sort();
  }, [appointments]);

  const filteredAppointments = React.useMemo(() => {
    if (serviceFilter.size === 0 && clientFilter.size === 0) return appointments;
    return appointments.filter((a) => {
      const serviceMatch =
        serviceFilter.size === 0 || serviceFilter.has(a.service.name);
      const clientMatch =
        clientFilter.size === 0 || clientFilter.has(getClientFullName(a));
      return serviceMatch && clientMatch;
    });
  }, [appointments, serviceFilter, clientFilter]);

  const filterCount = serviceFilter.size + clientFilter.size;

  // ─── Mini-calendar appointment dates ──────────────────

  const appointmentDates = new Set<string>();
  for (const a of filteredAppointments) {
    appointmentDates.add(formatDateKey(new Date(a.startTime)));
  }

  // ─── Header subhead (month / year or week range) ─────

  const monthYear = currentDate.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });
  let rangeLabel: string;
  if (view === "day") {
    rangeLabel = currentDate.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    });
  } else if (view === "week") {
    const monday = getMonday(currentDate);
    const sunday = addDays(monday, 6);
    const sameMonth = monday.getMonth() === sunday.getMonth();
    rangeLabel = sameMonth
      ? `${monday.toLocaleDateString("en-US", { month: "long" })} ${monday.getDate()} – ${sunday.getDate()}`
      : `${monday.toLocaleDateString("en-US", { month: "short" })} ${monday.getDate()} – ${sunday.toLocaleDateString("en-US", { month: "short" })} ${sunday.getDate()}`;
  } else {
    rangeLabel = monthYear;
  }

  // ─── Render ───────────────────────────────────────────

  return (
    <div className="flex flex-col h-full space-y-6">
      {/* ─── Header ─── */}
      <header className="space-y-3">
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div>
            <Heading variant="display" className="text-3xl md:text-4xl">
              Calendar
            </Heading>
            <p className="mt-1 font-sans text-sm text-ink-500">{monthYear}</p>
          </div>

          {/* View toggle (pill chips) */}
          <div className="flex items-center gap-2">
            <ViewChip active={view === "day"} onClick={() => setView("day")}>
              Day
            </ViewChip>
            <ViewChip active={view === "week"} onClick={() => setView("week")}>
              Week
            </ViewChip>
            <ViewChip active={view === "month"} onClick={() => setView("month")}>
              Month
            </ViewChip>
          </div>
        </div>

        {/* Nav controls */}
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <NavIconButton aria-label="Previous" onClick={goPrev}>
              <ChevronLeft size={16} strokeWidth={1.75} />
            </NavIconButton>
            <button
              type="button"
              onClick={goToday}
              className="h-9 rounded-md border border-ink-300 bg-cream-50 px-4 font-sans text-sm text-ink-900 transition-all duration-200 hover:border-ink-500 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
            >
              Today
            </button>
            <NavIconButton aria-label="Next" onClick={goNext}>
              <ChevronRight size={16} strokeWidth={1.75} />
            </NavIconButton>
            <span className="ml-2 font-display italic text-sm text-ink-500 hidden sm:inline">
              {rangeLabel}
            </span>
          </div>

          {/* Filter trigger */}
          <button
            type="button"
            onClick={() => setFilterOpen((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 h-9 px-4 rounded-pill border font-sans text-sm transition-all duration-200",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
              filterCount > 0
                ? "bg-rust-500 text-cream-50 border-rust-500"
                : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
            )}
          >
            <SlidersHorizontal size={14} strokeWidth={1.75} />
            {filterCount > 0 ? `Filters · ${filterCount}` : "Filter"}
          </button>
        </div>

        {/* Range label on small screens */}
        <p className="font-display italic text-sm text-ink-500 sm:hidden">
          {rangeLabel}
        </p>
      </header>

      {/* ─── Filter popover ─── */}
      {filterOpen && (
        <FilterPopover
          services={allServiceNames}
          clients={allClientNames}
          serviceFilter={serviceFilter}
          setServiceFilter={setServiceFilter}
          clientFilter={clientFilter}
          setClientFilter={setClientFilter}
          onClose={() => setFilterOpen(false)}
        />
      )}

      {/* ─── Calendar body ─── */}
      <div className="flex-1 min-h-0 flex flex-col gap-4">
        {/* Empty state when this view has zero appointments */}
        {!loading && filteredAppointments.length === 0 && (
          <div className="rounded-md border border-dashed border-ink-200">
            <EmptyState
              icon={CalendarIcon}
              size="sm"
              title="No appointments scheduled"
              description="Tap any time slot to set availability or block off time."
            />
          </div>
        )}

        {/* Grid by view */}
        <div
          className="flex-1 min-h-0 rounded-md border border-ink-200 bg-cream-50 overflow-hidden"
          onTouchStart={view === "day" ? onTouchStart : undefined}
          onTouchEnd={view === "day" ? onTouchEnd : undefined}
        >
          {loading ? (
            <CalendarSkeleton />
          ) : view === "month" ? (
            <CalendarMonth
              currentDate={currentDate}
              appointments={filteredAppointments}
              onSelectDay={handleMonthDayClick}
            />
          ) : (
            <CalendarGrid
              view={view}
              currentDate={currentDate}
              appointments={filteredAppointments}
              timeOffs={timeOffs}
              availabilityRules={rules}
              timezone="America/New_York"
              onReschedule={handleRescheduleRequest}
              onBlockTime={handleBlockTime}
            />
          )}
        </div>

        {/* Mini calendar (lg+) */}
        <div className="hidden lg:block">
          <MiniCalendar
            currentDate={currentDate}
            onDateSelect={handleDateSelect}
            appointmentDates={appointmentDates}
          />
        </div>
      </div>

      {/* Block-time modal */}
      {blockModal && (
        <BlockTimeModal
          initialDate={blockModal.date}
          initialHour={blockModal.hour}
          onClose={() => setBlockModal(null)}
          onCreated={handleBlockCreated}
        />
      )}

      {/* Reschedule confirmation */}
      {rescheduleConfirm && (
        <RescheduleDialog
          newStartTime={rescheduleConfirm.newStartTime}
          submitting={rescheduling}
          onCancel={() => !rescheduling && setRescheduleConfirm(null)}
          onConfirm={confirmReschedule}
        />
      )}
    </div>
  );
}

// ─── Sub-components ──────────────────────────────────────

function ViewChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "h-9 rounded-pill border px-4 font-sans text-sm transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        active
          ? "bg-rust-500 text-cream-50 border-rust-500"
          : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
      )}
    >
      {children}
    </button>
  );
}

function NavIconButton({
  children,
  ...rest
}: React.ButtonHTMLAttributes<HTMLButtonElement>): React.JSX.Element {
  return (
    <button
      type="button"
      {...rest}
      className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-ink-300 bg-cream-50 text-ink-700 transition-all duration-200 hover:border-ink-500 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
    >
      {children}
    </button>
  );
}

function FilterPopover({
  services,
  clients,
  serviceFilter,
  setServiceFilter,
  clientFilter,
  setClientFilter,
  onClose,
}: {
  services: string[];
  clients: string[];
  serviceFilter: Set<string>;
  setServiceFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  clientFilter: Set<string>;
  setClientFilter: React.Dispatch<React.SetStateAction<Set<string>>>;
  onClose: () => void;
}): React.JSX.Element {
  function toggle(setter: React.Dispatch<React.SetStateAction<Set<string>>>, value: string) {
    setter((prev) => {
      const next = new Set(prev);
      if (next.has(value)) next.delete(value);
      else next.add(value);
      return next;
    });
  }

  function clearAll() {
    setServiceFilter(new Set());
    setClientFilter(new Set());
  }

  return (
    <div className="rounded-md border border-ink-200 bg-cream-50 p-5 shadow-soft">
      <div className="mb-4 flex items-center justify-between">
        <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
          Filter
        </p>
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={clearAll}
            className="font-sans text-xs text-ink-500 hover:text-ink-900 transition-colors"
          >
            Clear
          </button>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close filter"
            className="text-ink-500 hover:text-ink-900 transition-colors"
          >
            <X size={16} strokeWidth={1.75} />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
        <div>
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-ink-500">
            Service
          </p>
          {services.length === 0 ? (
            <p className="font-sans text-sm text-ink-500">No services in view.</p>
          ) : (
            <div className="space-y-1.5">
              {services.map((s) => (
                <FilterRow
                  key={s}
                  label={s}
                  checked={serviceFilter.has(s)}
                  onClick={() => toggle(setServiceFilter, s)}
                />
              ))}
            </div>
          )}
        </div>
        <div>
          <p className="mb-2 font-sans text-xs uppercase tracking-wide text-ink-500">
            Client
          </p>
          {clients.length === 0 ? (
            <p className="font-sans text-sm text-ink-500">No clients in view.</p>
          ) : (
            <div className="space-y-1.5 max-h-64 overflow-y-auto pr-1">
              {clients.map((c) => (
                <FilterRow
                  key={c}
                  label={c}
                  checked={clientFilter.has(c)}
                  onClick={() => toggle(setClientFilter, c)}
                />
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FilterRow({
  label,
  checked,
  onClick,
}: {
  label: string;
  checked: boolean;
  onClick: () => void;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "flex w-full items-center gap-2.5 rounded-md border px-3 py-2 text-left transition-colors duration-150",
        checked
          ? "border-rust-500 bg-rust-500/5"
          : "border-ink-200 bg-cream-50 hover:border-ink-300",
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
          checked ? "border-rust-500 bg-rust-500" : "border-ink-300",
        )}
      >
        {checked && (
          <svg
            className="h-3 w-3 text-cream-50"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            strokeWidth={3}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        )}
      </span>
      <span className="font-sans text-sm text-ink-900">{label}</span>
    </button>
  );
}

function RescheduleDialog({
  newStartTime,
  submitting,
  onCancel,
  onConfirm,
}: {
  newStartTime: Date;
  submitting: boolean;
  onCancel: () => void;
  onConfirm: () => void;
}): React.JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center px-6">
      <div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        onClick={onCancel}
      />
      <div className="relative w-full max-w-sm overflow-hidden rounded-md border border-ink-200 bg-cream-50 shadow-elevated">
        <div className="px-6 py-5 space-y-2">
          <Heading variant="h3">Reschedule appointment?</Heading>
          <p className="font-sans text-sm text-ink-500 leading-relaxed">
            Move this appointment to{" "}
            <span className="text-ink-900">
              {newStartTime.toLocaleDateString("en-US", {
                weekday: "short",
                month: "short",
                day: "numeric",
              })}{" "}
              at{" "}
              {newStartTime.toLocaleTimeString("en-US", {
                hour: "numeric",
                minute: "2-digit",
              })}
            </span>
            ?
          </p>
        </div>
        <div className="flex justify-end gap-2 border-t border-ink-200 px-6 py-3">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onConfirm}
            disabled={submitting}
          >
            {submitting ? "Moving…" : "Confirm"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function CalendarSkeleton(): React.JSX.Element {
  return (
    <div className="p-6 space-y-3">
      <div className="grid grid-cols-7 gap-px">
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} className="h-10 skeleton-shimmer bg-cream-100" />
        ))}
      </div>
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="h-16 skeleton-shimmer bg-cream-100 rounded-md"
        />
      ))}
    </div>
  );
}
