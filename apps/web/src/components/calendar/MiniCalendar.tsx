"use client";

import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

type MiniCalendarProps = {
  currentDate: Date;
  onDateSelect: (date: Date) => void;
  appointmentDates?: Set<string>; // "YYYY-MM-DD" strings
};

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function isSameWeek(date: Date, anchor: Date): boolean {
  const getMonday = (d: Date) => {
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.getFullYear(), d.getMonth(), diff);
  };
  const monday1 = getMonday(new Date(date));
  const monday2 = getMonday(new Date(anchor));
  return isSameDay(monday1, monday2);
}

function formatDateKey(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export default function MiniCalendar({
  currentDate,
  onDateSelect,
  appointmentDates,
}: MiniCalendarProps): React.JSX.Element {
  const [viewMonth, setViewMonth] = React.useState(
    new Date(currentDate.getFullYear(), currentDate.getMonth(), 1)
  );

  // Update viewMonth when currentDate changes month
  React.useEffect(() => {
    setViewMonth(new Date(currentDate.getFullYear(), currentDate.getMonth(), 1));
  }, [currentDate]);

  const today = new Date();
  const year = viewMonth.getFullYear();
  const month = viewMonth.getMonth();

  // Build calendar grid
  const firstDay = new Date(year, month, 1);
  const startOffset = (firstDay.getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  const cells: (Date | null)[] = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);

  const monthLabel = viewMonth.toLocaleDateString("en-US", {
    month: "long",
    year: "numeric",
  });

  return (
    <div className="w-[220px] select-none">
      {/* Month header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setViewMonth(new Date(year, month - 1, 1))}
          aria-label="Previous month"
          className="p-1 rounded-md text-ink-500 hover:text-ink-900 hover:bg-cream-100 transition-colors"
        >
          <ChevronLeft size={14} aria-hidden="true" />
        </button>
        <span className="text-xs font-sans font-medium text-ink-900">{monthLabel}</span>
        <button
          onClick={() => setViewMonth(new Date(year, month + 1, 1))}
          aria-label="Next month"
          className="p-1 rounded-md text-ink-500 hover:text-ink-900 hover:bg-cream-100 transition-colors"
        >
          <ChevronRight size={14} aria-hidden="true" />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
          <div key={i} className="text-center text-[10px] font-sans font-medium py-0.5 text-ink-500">
            {d}
          </div>
        ))}
      </div>

      {/* Day cells */}
      <div className="grid grid-cols-7">
        {cells.map((date, i) => {
          if (!date) return <div key={i} className="h-7" />;

          const isToday = isSameDay(date, today);
          const isSelected = isSameDay(date, currentDate);
          const inWeek = isSameWeek(date, currentDate);
          const dateKey = formatDateKey(date);
          const hasAppt = appointmentDates?.has(dateKey);

          const cellClass = isSelected
            ? "bg-rust-500 text-cream-50 font-medium"
            : isToday
              ? "bg-rust-500/10 text-rust-500 font-medium"
              : inWeek
                ? "bg-cream-100 text-ink-900"
                : "text-ink-700 hover:bg-cream-100";

          return (
            <button
              key={i}
              onClick={() => onDateSelect(date)}
              className={
                "relative h-7 w-full flex items-center justify-center text-[11px] font-sans rounded-md transition-colors " +
                cellClass
              }
            >
              {date.getDate()}
              {hasAppt && !isSelected && (
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 w-1 h-1 rounded-pill bg-rust-500" />
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
