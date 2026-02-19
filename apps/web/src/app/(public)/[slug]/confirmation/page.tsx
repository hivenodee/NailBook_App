"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import Link from "next/link";
import { useSearchParams, useParams } from "next/navigation";

type AppointmentData = {
  id: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  status: string;
  service: {
    name: string;
    durationMinutes: number;
  };
  provider: {
    businessName: string;
    slug: string;
    timezone: string;
  };
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatDate(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  });
}

function toCalendarDate(iso: string) {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(appt: AppointmentData) {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${appt.service.name} — ${appt.provider.businessName}`,
    dates: `${toCalendarDate(appt.startTime)}/${toCalendarDate(appt.endTime)}`,
    details: `Booked via NailBook\nService: ${appt.service.name}\nDuration: ${appt.service.durationMinutes} min`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const STATUS_BADGE: Record<string, { label: string; className: string }> = {
  PENDING_PAYMENT: { label: "Processing Payment", className: "bg-yellow-100 text-yellow-800" },
  CONFIRMED: { label: "Confirmed", className: "bg-green-100 text-green-800" },
  CANCELLED: { label: "Cancelled", className: "bg-red-100 text-red-800" },
  COMPLETED: { label: "Completed", className: "bg-blue-100 text-blue-800" },
  NO_SHOW: { label: "No Show", className: "bg-gray-100 text-gray-800" },
};

export default function ConfirmationPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const params = useParams();
  const slug = params.slug as string;
  const appointmentId = searchParams.get("appointment");

  const [appt, setAppt] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [timedOut, setTimedOut] = useState(false);
  const pollCount = useRef(0);

  const fetchAppointment = useCallback(async () => {
    if (!appointmentId) return null;
    const res = await fetch(`/api/appointments/${appointmentId}`);
    const json = await res.json();
    return json.data as AppointmentData | null;
  }, [appointmentId]);

  // Initial fetch
  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    fetchAppointment()
      .then((data) => { if (data) setAppt(data); })
      .finally(() => setLoading(false));
  }, [appointmentId, fetchAppointment]);

  // Poll while PENDING_PAYMENT (every 3s, max 60s = 20 polls)
  useEffect(() => {
    if (!appt || appt.status !== "PENDING_PAYMENT") return;

    const interval = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current >= 20) {
        clearInterval(interval);
        setTimedOut(true);
        return;
      }
      const data = await fetchAppointment();
      if (data) {
        setAppt(data);
        if (data.status !== "PENDING_PAYMENT") {
          clearInterval(interval);
        }
      }
    }, 3000);

    return () => clearInterval(interval);
  }, [appt?.status, fetchAppointment]);

  const isPending = appt?.status === "PENDING_PAYMENT" && !timedOut;
  const isConfirmed = appt?.status === "CONFIRMED" || appt?.status === "COMPLETED";
  const isFailed = timedOut || (appt && !isPending && !isConfirmed);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-grid-2">
      <div className="max-w-md w-full text-center space-y-grid-3">
        {/* Status icon */}
        {isPending && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <svg className="w-8 h-8 text-yellow-600 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            </div>
            <h1 className="font-display text-2xl">Processing Payment</h1>
            <p className="text-text-secondary">
              Waiting for payment confirmation. This usually takes a few seconds...
            </p>
          </>
        )}

        {isConfirmed && (
          <>
            <div className="w-16 h-16 rounded-full bg-primary-light flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-primary"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M4.5 12.75l6 6 9-13.5"
                />
              </svg>
            </div>
            <h1 className="font-display text-2xl">You&apos;re Booked!</h1>
            <p className="text-text-secondary">
              A confirmation has been sent to your email. Your nail tech will see
              your appointment right away.
            </p>
          </>
        )}

        {isFailed && (
          <>
            <div className="w-16 h-16 rounded-full bg-yellow-100 flex items-center justify-center mx-auto">
              <svg
                className="w-8 h-8 text-yellow-600"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z"
                />
              </svg>
            </div>
            <h1 className="font-display text-2xl">Payment Not Completed</h1>
            <p className="text-text-secondary">
              We didn&apos;t receive a payment confirmation. You can try booking
              again or contact the provider.
            </p>
          </>
        )}

        {loading ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-left">
            <p className="text-sm text-text-muted text-center">Loading details...</p>
          </div>
        ) : appt ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-left space-y-grid-1">
            {/* Status badge */}
            {STATUS_BADGE[appt.status] && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Status</span>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_BADGE[appt.status].className}`}>
                  {STATUS_BADGE[appt.status].label}
                </span>
              </div>
            )}
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Service</span>
              <span className="font-medium">{appt.service.name}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Provider</span>
              <span className="font-medium">{appt.provider.businessName}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Date</span>
              <span className="font-medium">{formatDate(appt.startTime, appt.provider.timezone)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Time</span>
              <span className="font-medium">{formatTime(appt.startTime, appt.provider.timezone)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Duration</span>
              <span className="font-medium">{appt.service.durationMinutes} min</span>
            </div>
            <hr className="border-border" />
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Total</span>
              <span className="font-semibold">{formatPrice(appt.totalInCents)}</span>
            </div>
            {appt.depositInCents > 0 && (
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Deposit</span>
                <span className="font-semibold text-primary">
                  {formatPrice(appt.depositInCents)}
                </span>
              </div>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-left">
            <p className="text-sm text-text-muted text-center">
              Booking confirmed! Check your email for details.
            </p>
          </div>
        )}

        <div className="space-y-grid-1">
          {isConfirmed && appt ? (
            <a
              href={buildGoogleCalendarUrl(appt)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors text-center"
            >
              Add to Calendar
            </a>
          ) : isFailed && appt ? (
            <Link
              href={`/${slug}/book?service=${appt.service.name}`}
              className="block w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors text-center"
            >
              Try Again
            </Link>
          ) : isPending ? (
            <button
              disabled
              className="w-full bg-primary text-white py-3 rounded-button font-medium opacity-50"
            >
              Waiting for payment confirmation...
            </button>
          ) : (
            <button
              disabled
              className="w-full bg-primary text-white py-3 rounded-button font-medium opacity-50"
            >
              Add to Calendar
            </button>
          )}
          <Link
            href={`/${slug}`}
            className="block text-sm text-primary hover:underline"
          >
            Back to {appt?.provider.businessName || "provider"}
          </Link>
          <p className="text-sm text-text-muted">
            Want to manage your bookings?{" "}
            <Link href="/" className="text-primary hover:underline">
              Create an account
            </Link>{" "}
            or{" "}
            <Link href="/" className="text-primary hover:underline">
              get the app
            </Link>
            .
          </p>
        </div>
      </div>
    </main>
  );
}
