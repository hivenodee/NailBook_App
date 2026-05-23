"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

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

type CalendarGridProps = {
  view: "week" | "day";
  currentDate: Date;
  appointments: Appointment[];
  timeOffs: TimeOff[];
  availabilityRules: AvailabilityRule[];
  timezone: string;
  onReschedule: (appointmentId: string, newStartTime: Date) => void;
  onBlockTime: (date: Date, hour: number) => void;
};

// ─── Constants ───────────────────────────────────────────

const START_HOUR = 7;
const END_HOUR = 21;
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_HEIGHT = 48;
const HOUR_HEIGHT = SLOT_HEIGHT * 2;
const GRID_HEIGHT = TOTAL_HOURS * HOUR_HEIGHT;
const SNAP_MINUTES = 15;

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

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function timeToMinutes(timeStr: string): number {
  const [h, m] = timeStr.split(":").map(Number);
  return h * 60 + m;
}

function minutesToTop(minutes: number): number {
  return ((minutes - START_HOUR * 60) / 30) * SLOT_HEIGHT;
}

function topToMinutes(top: number): number {
  const rawMinutes = START_HOUR * 60 + (top / SLOT_HEIGHT) * 30;
  return Math.round(rawMinutes / SNAP_MINUTES) * SNAP_MINUTES;
}

function formatTime12h(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const period = h >= 12 ? "pm" : "am";
  const hour12 = h % 12 || 12;
  return m === 0
    ? `${hour12}${period}`
    : `${hour12}:${String(m).padStart(2, "0")}${period}`;
}

function getDisplayName(appt: Appointment): string {
  if (appt.client?.firstName) return appt.client.firstName;
  if (appt.clientName) return appt.clientName.split(" ")[0];
  return "Client";
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

// ─── Component ───────────────────────────────────────────

export default function CalendarGrid({
  view,
  currentDate,
  appointments,
  timeOffs,
  availabilityRules,
  onReschedule,
  onBlockTime,
}: CalendarGridProps): React.JSX.Element {
  const scrollRef = React.useRef<HTMLDivElement>(null);
  const [now, setNow] = React.useState(new Date());
  const [dragId, setDragId] = React.useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = React.useState<number | null>(null);
  const [dragOverTop, setDragOverTop] = React.useState<number | null>(null);

  React.useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(t);
  }, []);

  React.useEffect(() => {
    if (!scrollRef.current) return;
    const firstAppt = appointments[0];
    let scrollToMinutes = 9 * 60;
    if (firstAppt) {
      const start = new Date(firstAppt.startTime);
      scrollToMinutes = start.getHours() * 60 + start.getMinutes();
    }
    const scrollTop = minutesToTop(scrollToMinutes) - 60;
    scrollRef.current.scrollTop = Math.max(0, scrollTop);
  }, [currentDate, appointments]);

  const monday = getMonday(currentDate);
  const columns: Date[] =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      : [
          new Date(
            currentDate.getFullYear(),
            currentDate.getMonth(),
            currentDate.getDate(),
          ),
        ];

  const workingHours = new Map<number, { start: number; end: number }>();
  for (const rule of availabilityRules) {
    if (rule.isActive) {
      workingHours.set(rule.dayOfWeek, {
        start: timeToMinutes(rule.startTime),
        end: timeToMinutes(rule.endTime),
      });
    }
  }

  // ─── Drag & Drop ────────────────────────────────────────

  const handleDragStart = React.useCallback(
    (e: React.DragEvent, apptId: string) => {
      setDragId(apptId);
      e.dataTransfer.effectAllowed = "move";
      e.dataTransfer.setData("text/plain", apptId);
    },
    [],
  );

  const handleDragEnd = React.useCallback(() => {
    setDragId(null);
    setDragOverCol(null);
    setDragOverTop(null);
  }, []);

  const handleDragOver = React.useCallback(
    (e: React.DragEvent, colIndex: number) => {
      e.preventDefault();
      e.dataTransfer.dropEffect = "move";
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = topToMinutes(y);
      const snappedTop = minutesToTop(snappedMinutes);
      setDragOverCol(colIndex);
      setDragOverTop(snappedTop);
    },
    [],
  );

  const handleDrop = React.useCallback(
    (e: React.DragEvent, colIndex: number) => {
      e.preventDefault();
      const apptId = e.dataTransfer.getData("text/plain");
      if (!apptId) return;
      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = topToMinutes(y);
      const columnDate = columns[colIndex];
      const newStart = new Date(columnDate);
      newStart.setHours(
        Math.floor(snappedMinutes / 60),
        snappedMinutes % 60,
        0,
        0,
      );
      onReschedule(apptId, newStart);
      setDragId(null);
      setDragOverCol(null);
      setDragOverTop(null);
    },
    [columns, onReschedule],
  );

  // ─── Now line ──────────────────────────────────────────

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = minutesToTop(nowMinutes);
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  // ─── Render ────────────────────────────────────────────

  const isWeek = view === "week";
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Column headers */}
      <div className="flex sticky top-0 z-10 bg-cream-50 border-b border-ink-200">
        <div className="w-14 shrink-0" />
        {columns.map((date, i) => {
          const isToday = isSameDay(date, today);
          const dayName = date.toLocaleDateString("en-US", {
            weekday: isWeek ? "short" : "long",
          });
          const dayNum = date.getDate();
          return (
            <div
              key={i}
              className={cn(
                "flex-1 py-3 text-center border-l border-ink-200",
                isToday && "border-l-2 border-l-rust-500",
              )}
            >
              <div className="font-sans text-[10px] uppercase tracking-wide text-ink-500">
                {dayName}
              </div>
              <div
                className={cn(
                  "mt-1 font-display text-lg leading-none",
                  isToday ? "text-rust-500" : "text-ink-900",
                )}
              >
                {dayNum}
              </div>
              {isToday && (
                <span
                  aria-hidden="true"
                  className="mx-auto mt-1 block h-px w-5 bg-rust-500"
                />
              )}
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden bg-cream-50">
        <div className="flex relative" style={{ height: GRID_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 relative">
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 -translate-y-1/2 font-sans text-[10px] text-ink-500"
                style={{ top: i * HOUR_HEIGHT }}
              >
                {formatTime12h((START_HOUR + i) * 60)}
              </div>
            ))}
          </div>

          {/* Columns */}
          {columns.map((date, colIndex) => {
            const dayOfWeek = date.getDay();
            const hours = workingHours.get(dayOfWeek);
            const isToday = isSameDay(date, today);

            const colAppts = appointments.filter((a) =>
              isSameDay(new Date(a.startTime), date),
            );

            const dayStart = new Date(date);
            dayStart.setHours(0, 0, 0, 0);
            const dayEnd = new Date(date);
            dayEnd.setHours(23, 59, 59, 999);
            const colTimeOffs = timeOffs.filter((t) => {
              const start = new Date(t.startDate);
              const end = new Date(t.endDate);
              return start <= dayEnd && end >= dayStart;
            });

            return (
              <div
                key={colIndex}
                className={cn(
                  "flex-1 relative border-l border-ink-200 transition-colors duration-150",
                  "hover:bg-cream-100/40",
                  isToday && "border-l-2 border-l-rust-500",
                )}
                onDragOver={(e) => handleDragOver(e, colIndex)}
                onDrop={(e) => handleDrop(e, colIndex)}
                onClick={(e) => {
                  if (e.target !== e.currentTarget) return;
                  const rect = e.currentTarget.getBoundingClientRect();
                  const y = e.clientY - rect.top;
                  const minutes = topToMinutes(y);
                  const hour = Math.floor(minutes / 60);
                  onBlockTime(date, hour);
                }}
              >
                {/* Hour grid lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`h-${i}`}
                    className="absolute left-0 right-0 border-t border-ink-200"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`hh-${i}`}
                    className="absolute left-0 right-0 border-t border-ink-200/40"
                    style={{ top: i * HOUR_HEIGHT + SLOT_HEIGHT }}
                  />
                ))}

                {/* Non-working hours */}
                {hours ? (
                  <>
                    {hours.start > START_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 bg-cream-100/60 pointer-events-none"
                        style={{ top: 0, height: minutesToTop(hours.start) }}
                      />
                    )}
                    {hours.end < END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 bg-cream-100/60 pointer-events-none"
                        style={{
                          top: minutesToTop(hours.end),
                          height: GRID_HEIGHT - minutesToTop(hours.end),
                        }}
                      />
                    )}
                  </>
                ) : (
                  <div className="absolute inset-0 bg-cream-100/60 pointer-events-none" />
                )}

                {/* Time-off blocks */}
                {colTimeOffs.map((t) => {
                  const tStart = new Date(t.startDate);
                  const tEnd = new Date(t.endDate);
                  const visStart = Math.max(
                    tStart <= dayStart
                      ? START_HOUR * 60
                      : tStart.getHours() * 60 + tStart.getMinutes(),
                    START_HOUR * 60,
                  );
                  const visEnd = Math.min(
                    tEnd >= dayEnd
                      ? END_HOUR * 60
                      : tEnd.getHours() * 60 + tEnd.getMinutes(),
                    END_HOUR * 60,
                  );
                  if (visEnd <= visStart) return null;
                  const top = minutesToTop(visStart);
                  const height = ((visEnd - visStart) / 30) * SLOT_HEIGHT;

                  return (
                    <div
                      key={t.id}
                      className="absolute left-0.5 right-0.5 rounded-md overflow-hidden pointer-events-none z-[2] border border-ink-200"
                      style={{
                        top,
                        height,
                        background:
                          "repeating-linear-gradient(135deg, rgba(214,205,194,0.3) 0px, rgba(214,205,194,0.3) 6px, transparent 6px, transparent 12px)",
                      }}
                    >
                      <div className="px-2 py-1 font-sans text-[10px] uppercase tracking-wide text-ink-500">
                        {t.reason || "Blocked"}
                      </div>
                    </div>
                  );
                })}

                {/* Appointment blocks */}
                {colAppts.map((appt) => {
                  const start = new Date(appt.startTime);
                  const end = new Date(appt.endTime);
                  const startMin = start.getHours() * 60 + start.getMinutes();
                  const endMin = end.getHours() * 60 + end.getMinutes();
                  const top = minutesToTop(startMin);
                  const height = ((endMin - startMin) / 30) * SLOT_HEIGHT;
                  const name = getDisplayName(appt);
                  const isDragging = dragId === appt.id;
                  const isCancelled = appt.status === "CANCELLED";

                  return (
                    <div
                      key={appt.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appt.id)}
                      onDragEnd={handleDragEnd}
                      className={cn(
                        "absolute left-1 right-1 rounded-md overflow-hidden cursor-grab active:cursor-grabbing z-[3]",
                        "bg-cream-100 border border-ink-200 border-l-2 border-l-rust-500",
                        "transition-all duration-200",
                        "hover:-translate-y-px hover:border-ink-300",
                        isCancelled && "opacity-60",
                        isDragging &&
                          "scale-[1.02] ring-2 ring-rust-400/40 ring-offset-1 ring-offset-cream-50 shadow-soft",
                      )}
                      style={{ top, height: Math.max(height, SLOT_HEIGHT / 2) }}
                    >
                      {/* Status dot in upper-right */}
                      <span
                        aria-hidden="true"
                        className={cn(
                          "absolute right-1.5 top-1.5 h-1.5 w-1.5 rounded-pill",
                          statusDotClass(appt.status),
                        )}
                      />
                      <div className="px-2 py-1.5 pr-4">
                        <div
                          className={cn(
                            "font-sans text-sm text-ink-900 truncate",
                            isCancelled && "line-through",
                          )}
                        >
                          {name}
                        </div>
                        <div className="font-sans text-xs text-ink-500 truncate">
                          {appt.service.name}
                        </div>
                        {!isWeek && (
                          <div className="mt-0.5 font-sans text-[10px] uppercase tracking-wide text-ink-500">
                            {formatTime12h(startMin)} – {formatTime12h(endMin)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

                {/* Drop indicator */}
                {dragId && dragOverCol === colIndex && dragOverTop !== null && (
                  <div
                    className="absolute left-1 right-1 z-[4] pointer-events-none rounded-md border-2 border-dashed border-rust-500 bg-rust-500/5"
                    style={{ top: dragOverTop, height: SLOT_HEIGHT }}
                  />
                )}

                {/* Now line */}
                {isToday && showNowLine && (
                  <div
                    className="absolute left-0 right-0 z-[5] pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="flex items-center">
                      <span
                        aria-hidden="true"
                        className="-ml-1 h-2 w-2 rounded-pill bg-rust-500"
                      />
                      <span className="flex-1 h-px bg-rust-500" />
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
