"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";

type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

type AppointmentData = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  service: { name: string; durationMinutes: number };
  provider: { businessName: string; slug: string; timezone: string; cancellationHours: number };
};

function formatDateTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function toDateStr(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

export default function ManagePage(): React.JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const slug = params.slug as string;
  const appointmentId = params.appointmentId as string;
  const token = searchParams.get("token");

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [showCancelConfirm, setShowCancelConfirm] = useState(false);
  const [showReschedule, setShowReschedule] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);

  // Reschedule state
  const [selectedDate, setSelectedDate] = useState<Date>(getNextDays(1)[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  const days = getNextDays(30);

  const load = useCallback(async () => {
    if (!token) {
      setErrorMsg("Missing access token");
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/appointments/${appointmentId}?token=${token}`);
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to load appointment");
        return;
      }
      setAppointment(json.data);
    } catch {
      setErrorMsg("Something went wrong");
    } finally {
      setLoading(false);
    }
  }, [appointmentId, token]);

  useEffect(() => {
    load();
  }, [load]);

  // Fetch slots for reschedule
  const fetchSlots = useCallback(async () => {
    if (!showReschedule || !slug) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(`/api/availability/${slug}?date=${toDateStr(selectedDate)}`);
      const json = await res.json();
      const avail = json.data || {};
      setSlots(avail.slots || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [slug, selectedDate, showReschedule]);

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  async function handleCancel() {
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "cancel" }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to cancel");
        return;
      }
      setSuccess("Your appointment has been cancelled.");
      setShowCancelConfirm(false);
      await load();
    } catch {
      setErrorMsg("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReschedule() {
    if (!selectedSlot) return;
    setActionLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}?token=${token}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "reschedule", startTime: selectedSlot.startTime }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to reschedule");
        return;
      }
      setSuccess("Your appointment has been rescheduled.");
      setShowReschedule(false);
      await load();
    } catch {
      setErrorMsg("Something went wrong");
    } finally {
      setActionLoading(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto px-grid-2 py-grid-3 w-full">
          <div className="bg-surface rounded-card p-grid-3 border border-border/50 skeleton-shimmer space-y-grid-2">
            <div className="h-6 bg-border/60 rounded w-48" />
            <div className="space-y-2">
              <div className="h-4 bg-border/40 rounded w-full" />
              <div className="h-4 bg-border/40 rounded w-3/4" />
              <div className="h-4 bg-border/40 rounded w-1/2" />
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto px-grid-2 text-center">
          <p className="text-text-secondary">{errorMsg}</p>
        </div>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </main>
    );
  }

  const tz = appointment.provider.timezone;
  const isActive = ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status);
  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  const canModify = isActive && hoursUntil >= appointment.provider.cancellationHours;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-grid-2 py-grid-3 space-y-grid-3">
        <h1 className="font-display text-2xl text-center">Manage Booking</h1>

        {success && (
          <div className="bg-green-50 border border-green-200 rounded-card p-grid-2 text-center">
            <p className="text-sm text-green-700 font-medium">{success}</p>
          </div>
        )}

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-card p-grid-2 text-center">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Appointment details */}
        <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
          <div className="flex justify-between items-start">
            <h2 className="font-medium">{appointment.service.name}</h2>
            <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
              appointment.status === "CONFIRMED" ? "bg-status-success/10 text-status-success"
              : appointment.status === "CANCELLED" ? "bg-status-error/10 text-status-error"
              : "bg-status-warning/10 text-status-warning"
            }`}>
              {appointment.status === "CONFIRMED" ? "Confirmed"
                : appointment.status === "CANCELLED" ? "Cancelled"
                : appointment.status}
            </span>
          </div>
          <div className="space-y-1 text-sm">
            <p>
              <span className="text-text-muted">With:</span>{" "}
              {appointment.provider.businessName}
            </p>
            <p>
              <span className="text-text-muted">Date:</span>{" "}
              {formatDateTime(appointment.startTime, tz)}
            </p>
            <p>
              <span className="text-text-muted">Duration:</span>{" "}
              {appointment.service.durationMinutes} min
            </p>
            <p>
              <span className="text-text-muted">Total:</span>{" "}
              ${(appointment.totalInCents / 100).toFixed(2)}
            </p>
            {appointment.depositInCents > 0 && (
              <p>
                <span className="text-text-muted">Deposit paid:</span>{" "}
                ${(appointment.depositInCents / 100).toFixed(2)}
              </p>
            )}
          </div>
        </div>

        {/* Policies */}
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-xs text-text-muted space-y-1">
          <p>
            Cancellation: at least {appointment.provider.cancellationHours}h in advance.
          </p>
          {!canModify && isActive && (
            <p className="text-status-warning font-medium">
              This appointment is within the cancellation window and cannot be modified.
            </p>
          )}
        </div>

        {/* Actions */}
        {isActive && !showCancelConfirm && !showReschedule && (
          <div className="flex gap-grid-1">
            <button
              onClick={() => setShowReschedule(true)}
              disabled={!canModify}
              className="flex-1 bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Reschedule
            </button>
            <button
              onClick={() => setShowCancelConfirm(true)}
              disabled={!canModify}
              className="flex-1 py-3 rounded-button font-medium text-red-600 border border-red-200 hover:bg-red-50 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Cancel
            </button>
          </div>
        )}

        {/* Cancel confirmation */}
        {showCancelConfirm && (
          <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
            <p className="text-sm font-medium">Are you sure you want to cancel?</p>
            <p className="text-xs text-text-muted">
              {appointment.depositInCents > 0
                ? "Your deposit may be refunded per the provider's cancellation policy."
                : "This action cannot be undone."}
            </p>
            <div className="flex gap-grid-1">
              <button
                onClick={handleCancel}
                disabled={actionLoading}
                className="flex-1 bg-red-600 text-white py-2.5 rounded-button text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50"
              >
                {actionLoading ? "Cancelling..." : "Yes, cancel"}
              </button>
              <button
                onClick={() => { setShowCancelConfirm(false); setErrorMsg(null); }}
                className="flex-1 py-2.5 rounded-button text-sm font-medium text-text-secondary border border-border hover:bg-border/40 transition-colors"
              >
                Go back
              </button>
            </div>
          </div>
        )}

        {/* Reschedule */}
        {showReschedule && (
          <div className="space-y-grid-2">
            <div className="flex items-center justify-between">
              <h2 className="font-display text-xl">Pick a new time</h2>
              <button
                onClick={() => { setShowReschedule(false); setErrorMsg(null); }}
                className="text-sm text-text-muted hover:text-text-secondary"
              >
                Cancel
              </button>
            </div>

            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-grid-2 px-grid-2">
              {days.map((day) => {
                const isSelected = toDateStr(day) === toDateStr(selectedDate);
                return (
                  <button
                    key={toDateStr(day)}
                    onClick={() => setSelectedDate(day)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-button text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-surface text-text-secondary border border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-semibold">{day.getDate()}</span>
                    <span className="text-xs">
                      {day.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="bg-surface rounded-card p-grid-2 shadow-card">
              {slotsLoading ? (
                <p className="text-text-muted text-sm text-center py-grid-4">Loading times...</p>
              ) : slots.filter((s) => s.available).length === 0 ? (
                <p className="text-text-muted text-sm text-center py-grid-4">
                  No times available on this day.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {slots
                    .filter((s) => s.available)
                    .map((slot) => {
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      return (
                        <button
                          key={slot.startTime}
                          onClick={() => setSelectedSlot(slot)}
                          className={`py-2.5 rounded-button text-sm font-medium transition-colors ${
                            isSelected
                              ? "bg-primary text-white"
                              : "bg-background text-text-secondary hover:bg-primary-light"
                          }`}
                        >
                          {formatTime(slot.startTime, tz)}
                        </button>
                      );
                    })}
                </div>
              )}
            </div>

            <button
              onClick={handleReschedule}
              disabled={!selectedSlot || actionLoading}
              className="w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              {actionLoading ? "Rescheduling..." : "Confirm New Time"}
            </button>
          </div>
        )}
      </div>
    </main>
  );
}
