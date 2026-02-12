"use client";

import React, { useEffect, useState } from "react";
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
  };
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
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

export default function ConfirmationPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const params = useParams();
  const slug = params.slug as string;
  const appointmentId = searchParams.get("appointment");

  const [appt, setAppt] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setAppt(json.data);
      })
      .finally(() => setLoading(false));
  }, [appointmentId]);

  return (
    <main className="min-h-screen bg-background flex items-center justify-center px-grid-2">
      <div className="max-w-md w-full text-center space-y-grid-3">
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

        <h1 className="text-2xl font-semibold">You&apos;re Booked!</h1>
        <p className="text-text-secondary">
          A confirmation has been sent to your email. Your nail tech will see
          your appointment right away.
        </p>

        {loading ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-left">
            <p className="text-sm text-text-muted text-center">Loading details...</p>
          </div>
        ) : appt ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-left space-y-grid-1">
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
              <span className="font-medium">{formatDate(appt.startTime)}</span>
            </div>
            <div className="flex justify-between text-sm">
              <span className="text-text-muted">Time</span>
              <span className="font-medium">{formatTime(appt.startTime)}</span>
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
          {appt ? (
            <a
              href={buildGoogleCalendarUrl(appt)}
              target="_blank"
              rel="noopener noreferrer"
              className="block w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors text-center"
            >
              Add to Calendar
            </a>
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
