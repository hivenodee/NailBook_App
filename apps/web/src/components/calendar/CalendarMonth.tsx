"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  service: { name: string };
};

export type CalendarMonthProps = {
  currentDate: Date;
  appointments: Appointment[];
  onSelectDay: (date: Date) => void;
};

function startOfMonthGrid(d: Date): Date {
  // Monday-first grid: find the Monday on or before the 1st of the month.
  const first = new Date(d.getFullYear(), d.getMonth(), 1);
  const dayOfWeek = first.getDay();
  const offset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(first);
  start.setDate(first.getDate() + offset);
  start.setHours(0, 0, 0, 0);
  return start;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

function statusDotClass(status: string): string {
  switch (status) {
    case "CONFIRMED":
      return "bg-success";
    case "PENDING_PAYMENT":
      return "bg-warning";
    case "COMPLETED":
      return "bg-ink-500";
    case "CANCELLED":
      return "bg-error";
    default:
      return "bg-ink-300";
  }
}

const WEEK_HEADERS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

export function CalendarMonth({
  currentDate,
  appointments,
  onSelectDay,
}: CalendarMonthProps): React.JSX.Element {
  const today = new Date();
  const gridStart = startOfMonthGrid(currentDate);

  // Always 6 weeks (42 cells) so the grid height is stable across months.
  const cells: Date[] = Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart);
    d.setDate(gridStart.getDate() + i);
    return d;
  });

  // Bucket appointments by date key for quick lookup.
  const byDay = React.useMemo(() => {
    const map = new Map<string, Appointment[]>();
    for (const a of appointments) {
      const d = new Date(a.startTime);
      const key = `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
      const arr = map.get(key) ?? [];
      arr.push(a);
      map.set(key, arr);
    }
    return map;
  }, [appointments]);

  return (
    <div className="flex flex-col h-full">
      {/* Weekday headers */}
      <div className="grid grid-cols-7 border-b border-ink-200">
        {WEEK_HEADERS.map((label) => (
          <div
            key={label}
            className="py-3 text-center font-sans text-xs uppercase tracking-wide text-ink-500"
          >
            {label}
          </div>
        ))}
      </div>

      {/* Grid of days */}
      <div className="flex-1 grid grid-cols-7 grid-rows-6">
        {cells.map((date, idx) => {
          const inMonth = isSameMonth(date, currentDate);
          const isToday = isSameDay(date, today);
          const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
          const dayAppts = byDay.get(key) ?? [];
          const showDots = dayAppts.slice(0, 3);
          const overflow = Math.max(0, dayAppts.length - 3);

          return (
            <button
              key={idx}
              type="button"
              onClick={() => onSelectDay(date)}
              className={cn(
                "relative flex flex-col items-start gap-1.5 p-2 sm:p-3 text-left transition-colors duration-150",
                "border-r border-b border-ink-200",
                "hover:bg-cream-100 focus-visible:outline-none focus-visible:bg-cream-100",
                isToday && "border-l-2 border-l-rust-500",
                !inMonth && "bg-cream-50/60",
              )}
            >
              <span
                className={cn(
                  "font-display text-base leading-none",
                  isToday
                    ? "text-rust-500"
                    : inMonth
                      ? "text-ink-900"
                      : "text-ink-300",
                )}
              >
                {date.getDate()}
              </span>

              {dayAppts.length > 0 && (
                <span className="flex flex-wrap items-center gap-1">
                  {showDots.map((a) => (
                    <span
                      key={a.id}
                      aria-hidden="true"
                      className={cn(
                        "inline-block h-1.5 w-1.5 rounded-pill",
                        statusDotClass(a.status),
                      )}
                    />
                  ))}
                  {overflow > 0 && (
                    <span className="font-sans text-[10px] text-ink-500">
                      +{overflow}
                    </span>
                  )}
                </span>
              )}

              {dayAppts.length > 0 && (
                <span className="font-sans text-[10px] uppercase tracking-wide text-ink-500 mt-auto">
                  {dayAppts.length} booking{dayAppts.length !== 1 ? "s" : ""}
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
