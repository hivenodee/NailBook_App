"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { statusColor, statusLabel } from "@/lib/status-colors";

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
  dayOfWeek: number; // 0=Sun, 6=Sat
  startTime: string; // "HH:mm"
  endTime: string;   // "HH:mm"
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
const END_HOUR = 21; // 9 PM
const TOTAL_HOURS = END_HOUR - START_HOUR;
const SLOT_HEIGHT = 48; // px per 30-minute slot
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
  const period = h >= 12 ? "PM" : "AM";
  const hour12 = h % 12 || 12;
  return m === 0 ? `${hour12} ${period}` : `${hour12}:${String(m).padStart(2, "0")} ${period}`;
}

function getDisplayName(appt: Appointment): string {
  if (appt.client?.firstName) return appt.client.firstName;
  if (appt.clientName) return appt.clientName.split(" ")[0];
  return "Client";
}

// ─── Component ───────────────────────────────────────────

export default function CalendarGrid({
  view,
  currentDate,
  appointments,
  timeOffs,
  availabilityRules,
  timezone,
  onReschedule,
  onBlockTime,
}: CalendarGridProps): React.JSX.Element {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [now, setNow] = useState(new Date());
  const [dragId, setDragId] = useState<string | null>(null);
  const [dragOverCol, setDragOverCol] = useState<number | null>(null);
  const [dragOverTop, setDragOverTop] = useState<number | null>(null);

  // Update current time every minute
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Auto-scroll to first appointment or 9 AM on mount/date change
  useEffect(() => {
    if (!scrollRef.current) return;
    const firstAppt = appointments[0];
    let scrollToMinutes = 9 * 60; // default 9 AM
    if (firstAppt) {
      const start = new Date(firstAppt.startTime);
      scrollToMinutes = start.getHours() * 60 + start.getMinutes();
    }
    const scrollTop = minutesToTop(scrollToMinutes) - 60; // offset a bit above
    scrollRef.current.scrollTop = Math.max(0, scrollTop);
  }, [currentDate, appointments]);

  // Build columns for the view
  const monday = getMonday(currentDate);
  const columns: Date[] =
    view === "week"
      ? Array.from({ length: 7 }, (_, i) => addDays(monday, i))
      : [new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate())];

  // Build working hours map: dayOfWeek → { start, end } in minutes
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

  const handleDragStart = useCallback((e: React.DragEvent, apptId: string) => {
    setDragId(apptId);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", apptId);
    // Make drag ghost semi-transparent
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "0.5";
    }
  }, []);

  const handleDragEnd = useCallback((e: React.DragEvent) => {
    if (e.currentTarget instanceof HTMLElement) {
      e.currentTarget.style.opacity = "1";
    }
    setDragId(null);
    setDragOverCol(null);
    setDragOverTop(null);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent, colIndex: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    const rect = e.currentTarget.getBoundingClientRect();
    const y = e.clientY - rect.top;
    const snappedMinutes = topToMinutes(y);
    const snappedTop = minutesToTop(snappedMinutes);
    setDragOverCol(colIndex);
    setDragOverTop(snappedTop);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent, colIndex: number) => {
      e.preventDefault();
      const apptId = e.dataTransfer.getData("text/plain");
      if (!apptId) return;

      const rect = e.currentTarget.getBoundingClientRect();
      const y = e.clientY - rect.top;
      const snappedMinutes = topToMinutes(y);
      const columnDate = columns[colIndex];
      const newStart = new Date(columnDate);
      newStart.setHours(Math.floor(snappedMinutes / 60), snappedMinutes % 60, 0, 0);

      onReschedule(apptId, newStart);
      setDragId(null);
      setDragOverCol(null);
      setDragOverTop(null);
    },
    [columns, onReschedule]
  );

  // ─── Current time line position ──────────────────────────

  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const nowTop = minutesToTop(nowMinutes);
  const showNowLine = nowMinutes >= START_HOUR * 60 && nowMinutes <= END_HOUR * 60;

  // ─── Render ─────────────────────────────────────────────

  const isWeek = view === "week";
  const today = new Date();

  return (
    <div className="flex flex-col flex-1 min-h-0">
      {/* Column headers */}
      <div className={`flex border-b border-border bg-surface sticky top-0 z-10 ${isWeek ? "" : ""}`}>
        {/* Time gutter spacer */}
        <div className="w-14 shrink-0" />

        {columns.map((date, i) => {
          const isToday = isSameDay(date, today);
          const dayName = date.toLocaleDateString("en-US", { weekday: isWeek ? "short" : "long" });
          const dayNum = date.getDate();

          return (
            <div
              key={i}
              className={`flex-1 py-2 text-center border-l border-border ${
                isToday ? "bg-primary-light/30" : ""
              }`}
            >
              <div className="text-[10px] uppercase tracking-wider text-text-muted font-medium">
                {dayName}
              </div>
              <div
                className={`text-sm font-medium mt-0.5 ${
                  isToday
                    ? "bg-primary text-white w-7 h-7 rounded-full flex items-center justify-center mx-auto"
                    : "text-text-primary"
                }`}
              >
                {dayNum}
              </div>
            </div>
          );
        })}
      </div>

      {/* Scrollable grid */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto overflow-x-hidden">
        <div className="flex relative" style={{ height: GRID_HEIGHT }}>
          {/* Time gutter */}
          <div className="w-14 shrink-0 relative">
            {Array.from({ length: TOTAL_HOURS }, (_, i) => (
              <div
                key={i}
                className="absolute right-2 text-[10px] text-text-muted -translate-y-1/2"
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

            // Filter appointments for this column
            const colAppts = appointments.filter((a) => {
              const start = new Date(a.startTime);
              return isSameDay(start, date);
            });

            // Filter time-offs overlapping this column
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
                className="flex-1 relative border-l border-border"
                onDragOver={(e) => handleDragOver(e, colIndex)}
                onDrop={(e) => handleDrop(e, colIndex)}
                onClick={(e) => {
                  // Only trigger on click on the column background, not on appointments
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
                    key={i}
                    className="absolute left-0 right-0 border-t border-border/50"
                    style={{ top: i * HOUR_HEIGHT }}
                  />
                ))}

                {/* Half-hour grid lines */}
                {Array.from({ length: TOTAL_HOURS }, (_, i) => (
                  <div
                    key={`half-${i}`}
                    className="absolute left-0 right-0 border-t border-border/20"
                    style={{ top: i * HOUR_HEIGHT + SLOT_HEIGHT }}
                  />
                ))}

                {/* Non-working hours dimming */}
                {hours ? (
                  <>
                    {/* Before working hours */}
                    {hours.start > START_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 bg-surface-alt/60"
                        style={{
                          top: 0,
                          height: minutesToTop(hours.start),
                        }}
                      />
                    )}
                    {/* After working hours */}
                    {hours.end < END_HOUR * 60 && (
                      <div
                        className="absolute left-0 right-0 bg-surface-alt/60"
                        style={{
                          top: minutesToTop(hours.end),
                          height: GRID_HEIGHT - minutesToTop(hours.end),
                        }}
                      />
                    )}
                  </>
                ) : (
                  /* Entire day is off */
                  <div className="absolute inset-0 bg-surface-alt/60" />
                )}

                {/* Time-off blocks */}
                {colTimeOffs.map((t) => {
                  const tStart = new Date(t.startDate);
                  const tEnd = new Date(t.endDate);

                  // Clamp to day bounds and visible range
                  const visStart = Math.max(
                    tStart <= dayStart ? START_HOUR * 60 : tStart.getHours() * 60 + tStart.getMinutes(),
                    START_HOUR * 60
                  );
                  const visEnd = Math.min(
                    tEnd >= dayEnd ? END_HOUR * 60 : tEnd.getHours() * 60 + tEnd.getMinutes(),
                    END_HOUR * 60
                  );

                  if (visEnd <= visStart) return null;

                  const top = minutesToTop(visStart);
                  const height = ((visEnd - visStart) / 30) * SLOT_HEIGHT;

                  return (
                    <div
                      key={t.id}
                      className="absolute left-0.5 right-0.5 rounded-sm overflow-hidden pointer-events-none z-[2]"
                      style={{
                        top,
                        height,
                        background:
                          "repeating-linear-gradient(135deg, transparent, transparent 4px, rgba(229,223,214,0.5) 4px, rgba(229,223,214,0.5) 8px)",
                        backgroundColor: "rgba(229,223,214,0.3)",
                      }}
                    >
                      <div className="px-1 py-0.5 text-[10px] text-text-muted font-medium">
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
                  const statusClasses = statusColor(appt.status);

                  // Pick a left border color based on status
                  const borderColor =
                    appt.status === "CONFIRMED"
                      ? "border-l-status-success"
                      : appt.status === "PENDING_PAYMENT"
                        ? "border-l-status-warning"
                        : appt.status === "COMPLETED"
                          ? "border-l-status-info"
                          : appt.status === "CANCELLED"
                            ? "border-l-status-error"
                            : "border-l-border";

                  return (
                    <div
                      key={appt.id}
                      draggable
                      onDragStart={(e) => handleDragStart(e, appt.id)}
                      onDragEnd={handleDragEnd}
                      className={`absolute left-1 right-1 rounded-sm px-1.5 py-0.5 overflow-hidden cursor-grab active:cursor-grabbing border-l-2 z-[3] transition-shadow ${borderColor} ${
                        isDragging ? "opacity-50" : "hover:shadow-soft"
                      }`}
                      style={{
                        top,
                        height: Math.max(height, SLOT_HEIGHT / 2),
                        backgroundColor:
                          appt.status === "CANCELLED" ? "rgba(191,107,107,0.08)" : "rgba(123,139,106,0.12)",
                      }}
                    >
                      <div className="text-[11px] font-medium text-text-primary truncate">
                        {name}
                      </div>
                      <div className="text-[10px] text-text-secondary truncate">
                        {appt.service.name}
                      </div>
                      {!isWeek && (
                        <>
                          <div className="text-[10px] text-text-muted">
                            {formatTime12h(startMin)} – {formatTime12h(endMin)}
                          </div>
                          <span
                            className={`inline-block mt-0.5 px-1 py-0.5 rounded text-[9px] font-medium ${statusClasses}`}
                          >
                            {statusLabel(appt.status)}
                          </span>
                        </>
                      )}
                    </div>
                  );
                })}

                {/* Drag drop indicator */}
                {dragId && dragOverCol === colIndex && dragOverTop !== null && (
                  <div
                    className="absolute left-1 right-1 border-2 border-dashed border-primary rounded-sm bg-primary-light/30 z-[4] pointer-events-none"
                    style={{ top: dragOverTop, height: SLOT_HEIGHT }}
                  />
                )}

                {/* Current time line */}
                {isToday && showNowLine && (
                  <div
                    className="absolute left-0 right-0 z-[5] pointer-events-none"
                    style={{ top: nowTop }}
                  >
                    <div className="flex items-center">
                      <div className="w-2 h-2 rounded-full bg-status-error -ml-1" />
                      <div className="flex-1 h-[2px] bg-status-error" />
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
