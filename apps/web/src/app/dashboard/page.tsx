"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { statusColor, statusLabel } from "@/lib/status-colors";

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  service: { name: string };
  client: { firstName: string | null; lastName: string | null };
  provider: { businessName: string; slug: string; timezone: string };
};

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
    month: "short",
    day: "numeric",
    timeZone: tz,
  });
}

function isToday(iso: string) {
  const d = new Date(iso);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

export default function DashboardTodayPage() {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function load() {
      try {
        const [confirmedRes, pendingRes] = await Promise.all([
          fetch("/api/appointments?status=CONFIRMED"),
          fetch("/api/appointments?status=PENDING_PAYMENT"),
        ]);
        const confirmed = await confirmedRes.json();
        const pending = await pendingRes.json();
        const all = [
          ...(confirmed.data || []),
          ...(pending.data || []),
        ].sort(
          (a: Appointment, b: Appointment) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime()
        );
        // Only show upcoming (from start of today onward)
        const startOfToday = new Date();
        startOfToday.setHours(0, 0, 0, 0);
        const upcoming = all.filter(
          (a: Appointment) => new Date(a.startTime) >= startOfToday
        );
        setAppointments(upcoming);
      } catch (e) {
        console.error("Failed to load appointments:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Group by date
  const grouped: Record<string, Appointment[]> = {};
  for (const appt of appointments) {
    const key = isToday(appt.startTime)
      ? "Today"
      : formatDate(appt.startTime, appt.provider.timezone);
    if (!grouped[key]) grouped[key] = [];
    grouped[key].push(appt);
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Today</h1>

      {loading ? (
        <div className="space-y-grid-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-border/60 rounded w-32" />
                  <div className="h-3 bg-border/40 rounded w-24" />
                  <div className="h-3 bg-border/40 rounded w-28" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 bg-border/40 rounded-full w-20 ml-auto" />
                  <div className="h-4 bg-border/60 rounded w-14 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : appointments.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">No upcoming appointments</p>
        </div>
      ) : (
        Object.entries(grouped).map(([dateLabel, appts]) => (
          <section key={dateLabel} className="space-y-grid-1">
            <h2 className="text-lg font-medium mb-grid-1">{dateLabel}</h2>
            {appts.map((appt) => {
              const clientDisplay =
                appt.client.firstName
                  ? `${appt.client.firstName} ${appt.client.lastName || ""}`.trim()
                  : appt.clientName || appt.clientEmail || "Client";

              return (
                <Link
                  key={appt.id}
                  href={`/dashboard/appointments/${appt.id}`}
                  className="block bg-surface rounded-card p-grid-2 border border-border/50 hover:shadow-soft hover:-translate-y-0.5 transition-all duration-200"
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{clientDisplay}</p>
                      <p className="text-sm text-text-muted">
                        {appt.service.name}
                      </p>
                      <p className="text-sm text-text-muted mt-1">
                        {formatTime(appt.startTime, appt.provider.timezone)} – {formatTime(appt.endTime, appt.provider.timezone)}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(appt.status)}`}
                      >
                        {statusLabel(appt.status)}
                      </span>
                      <p className="font-display text-base">
                        ${(appt.totalInCents / 100).toFixed(2)}
                      </p>
                      {appt.depositInCents > 0 && (
                        <p className="text-xs text-text-muted">
                          Deposit: ${(appt.depositInCents / 100).toFixed(2)}
                        </p>
                      )}
                    </div>
                  </div>
                </Link>
              );
            })}
          </section>
        ))
      )}
    </div>
  );
}
