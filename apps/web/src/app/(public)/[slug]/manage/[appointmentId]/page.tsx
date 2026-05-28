"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useParams } from "next/navigation";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

function statusBadgeVariant(status: string): "verified" | "warning" | "error" | "neutral" {
  if (status === "CONFIRMED") return "verified";
  if (status === "CANCELLED") return "error";
  if (status === "PENDING_PAYMENT" || status === "PENDING") return "warning";
  return "neutral";
}

function statusLabel(status: string): string {
  if (status === "CONFIRMED") return "Confirmed";
  if (status === "CANCELLED") return "Cancelled";
  if (status === "PENDING_PAYMENT") return "Pending payment";
  return status.replace(/_/g, " ").toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
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
  // `null` = haven't fetched yet for this date; `[]` = fetched, no slots.
  // The distinction prevents a flash of "No times available" before the
  // first fetch completes.
  const [slots, setSlots] = useState<TimeSlot[] | null>(null);
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

  const fetchSlots = useCallback(async () => {
    if (!showReschedule || !slug) return;
    setSlots(null); // reset to "not yet fetched" so the empty-state doesn't flash
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
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <Card padding="lg" className="max-w-md w-full skeleton-shimmer space-y-3">
          <div className="h-6 w-48 skeleton-shimmer rounded-md" />
          <div className="h-4 w-full skeleton-shimmer rounded-md" />
          <div className="h-4 w-3/4 skeleton-shimmer rounded-md" />
          <div className="h-4 w-1/2 skeleton-shimmer rounded-md" />
        </Card>
      </main>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <p className="font-sans text-base text-ink-500 text-center max-w-md">{errorMsg}</p>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="h-5 w-32 skeleton-shimmer rounded-md" />
      </main>
    );
  }

  const tz = appointment.provider.timezone;
  const isActive = ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status);
  const hoursUntil = (new Date(appointment.startTime).getTime() - Date.now()) / (1000 * 60 * 60);
  const canModify = isActive && hoursUntil >= appointment.provider.cancellationHours;

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-md mx-auto px-6 py-12 space-y-6">
        <Heading variant="display" className="text-4xl text-center">Manage booking</Heading>

        {success && (
          <div className="rounded-md border border-success/30 bg-success/10 px-4 py-3 text-center">
            <p className="text-sm font-sans text-success font-medium">{success}</p>
          </div>
        )}

        {errorMsg && (
          <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-center">
            <p className="text-sm font-sans text-error">{errorMsg}</p>
          </div>
        )}

        {/* Appointment details */}
        <Card padding="lg" className="space-y-4">
          <div className="flex justify-between items-start gap-3">
            <h2 className="font-display text-xl text-ink-900">{appointment.service.name}</h2>
            <Badge variant={statusBadgeVariant(appointment.status)}>
              {statusLabel(appointment.status)}
            </Badge>
          </div>
          <dl className="space-y-2 text-sm font-sans">
            <Row label="With">{appointment.provider.businessName}</Row>
            <Row label="Date">{formatDateTime(appointment.startTime, tz)}</Row>
            <Row label="Duration">{appointment.service.durationMinutes} min</Row>
            <Row label="Total">${(appointment.totalInCents / 100).toFixed(2)}</Row>
            {appointment.depositInCents > 0 && (
              <Row label="Deposit paid">
                ${(appointment.depositInCents / 100).toFixed(2)}
              </Row>
            )}
          </dl>
        </Card>

        {/* Policies */}
        <Card padding="md">
          <p className="text-xs font-sans text-ink-500">
            Cancellation: at least {appointment.provider.cancellationHours}h in advance.
          </p>
          {!canModify && isActive && (
            <p className="text-xs font-sans text-warning font-medium mt-1">
              This appointment is within the cancellation window and cannot be modified.
            </p>
          )}
        </Card>

        {/* Actions */}
        {isActive && !showCancelConfirm && !showReschedule && (
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="md"
              className="flex-1"
              onClick={() => setShowReschedule(true)}
              disabled={!canModify}
            >
              Reschedule
            </Button>
            <Button
              variant="secondary"
              size="md"
              className="flex-1"
              onClick={() => setShowCancelConfirm(true)}
              disabled={!canModify}
            >
              Cancel
            </Button>
          </div>
        )}

        {/* Cancel confirmation */}
        {showCancelConfirm && (
          <Card padding="lg" className="space-y-4">
            <p className="text-sm font-sans font-medium text-ink-900">
              Are you sure you want to cancel?
            </p>
            <p className="text-xs font-sans text-ink-500">
              {appointment.depositInCents > 0
                ? "Your deposit may be refunded per the provider's cancellation policy."
                : "This action cannot be undone."}
            </p>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                className="flex-1"
                onClick={handleCancel}
                disabled={actionLoading}
              >
                {actionLoading ? "Cancelling…" : "Yes, cancel"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="flex-1"
                onClick={() => {
                  setShowCancelConfirm(false);
                  setErrorMsg(null);
                }}
              >
                Go back
              </Button>
            </div>
          </Card>
        )}

        {/* Reschedule */}
        {showReschedule && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Heading variant="h4" className="text-xl">Pick a new time</Heading>
              <button
                onClick={() => {
                  setShowReschedule(false);
                  setErrorMsg(null);
                }}
                className="text-sm font-sans font-medium text-ink-500 hover:text-ink-700 transition-colors"
              >
                Cancel
              </button>
            </div>

            {/* Date picker */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-6 px-6">
              {days.map((day) => {
                const isSelected = toDateStr(day) === toDateStr(selectedDate);
                return (
                  <button
                    key={toDateStr(day)}
                    onClick={() => setSelectedDate(day)}
                    className={
                      "shrink-0 flex flex-col items-center px-3 py-2 rounded-md text-sm font-sans transition-colors " +
                      (isSelected
                        ? "bg-rust-500 text-cream-50 border border-rust-500"
                        : "bg-cream-50 text-ink-700 border border-ink-200 hover:border-ink-500")
                    }
                  >
                    <span className="text-xs font-medium">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="font-display text-xl">{day.getDate()}</span>
                    <span className="text-xs">
                      {day.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <Card padding="md">
              {slotsLoading || slots === null ? (
                <p className="text-sm text-center font-sans text-ink-500 py-8">Loading times…</p>
              ) : slots.filter((s) => s.available).length === 0 ? (
                <p className="text-sm text-center font-sans text-ink-500 py-8">
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
                          className={
                            "py-2.5 rounded-md text-sm font-sans font-medium transition-colors border " +
                            (isSelected
                              ? "bg-rust-500 text-cream-50 border-rust-500"
                              : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-500")
                          }
                        >
                          {formatTime(slot.startTime, tz)}
                        </button>
                      );
                    })}
                </div>
              )}
            </Card>

            <Button
              variant="primary"
              size="md"
              className="w-full"
              onClick={handleReschedule}
              disabled={!selectedSlot || actionLoading}
            >
              {actionLoading ? "Rescheduling…" : "Confirm new time"}
            </Button>
          </div>
        )}
      </div>
    </main>
  );
}

function Row({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-500">{label}</dt>
      <dd className="text-ink-900 font-medium text-right">{children}</dd>
    </div>
  );
}
