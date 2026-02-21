"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { statusColor, statusLabel } from "@/lib/status-colors";

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  recurrenceGroupId: string | null;
  recurrenceIndex: number | null;
  service: { name: string };
  addOns: { id: string; name: string; priceInCents: number }[];
  client: { firstName: string | null; lastName: string | null };
  provider: { businessName: string; slug: string; timezone: string };
};

type StatusFilter = "ALL" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "CONFIRMED" | "PENDING_PAYMENT";

function formatDateTime(iso: string, tz: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
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

const FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CONFIRMED", label: "Confirmed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "NO_SHOW", label: "No-Show" },
  { value: "PENDING_PAYMENT", label: "Pending" },
];

export default function HistoryPage(): React.JSX.Element {
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<StatusFilter>("ALL");

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/appointments");
        const json = await res.json();
        const all = (json.data || []).sort(
          (a: Appointment, b: Appointment) =>
            new Date(b.startTime).getTime() - new Date(a.startTime).getTime()
        );
        setAppointments(all);
      } catch (e) {
        console.error("Failed to load appointments:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  const filtered =
    filter === "ALL"
      ? appointments
      : appointments.filter((a) => a.status === filter);

  const twentyFourHoursAgo = Date.now() - 24 * 60 * 60 * 1000;

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Appointments</h1>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors whitespace-nowrap ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-grid-1">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-border/60 rounded w-32" />
                  <div className="h-3 bg-border/40 rounded w-24" />
                  <div className="h-3 bg-border/40 rounded w-40" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 bg-border/40 rounded-full w-20 ml-auto" />
                  <div className="h-4 bg-border/60 rounded w-14 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">
            {filter === "ALL"
              ? "No appointments yet."
              : `No ${statusLabel(filter).toLowerCase()} appointments.`}
          </p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {filtered.map((appt) => {
            const clientDisplay =
              appt.client.firstName
                ? `${appt.client.firstName} ${appt.client.lastName || ""}`.trim()
                : appt.clientName || appt.clientEmail || "Client";
            const isNew = new Date(appt.createdAt).getTime() > twentyFourHoursAgo;

            return (
              <Link
                key={appt.id}
                href={`/dashboard/appointments/${appt.id}`}
                className="relative block bg-surface rounded-card p-grid-2 shadow-card hover:shadow-md transition-shadow overflow-hidden"
              >
                {isNew && (
                  <span className="absolute top-0 right-0 bg-primary text-white text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-bl-lg">
                    New
                  </span>
                )}
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{clientDisplay}</p>
                    <p className="text-sm text-text-muted flex items-center gap-1">
                      {appt.service.name}
                      {appt.recurrenceGroupId && (
                        <svg className="w-3.5 h-3.5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                        </svg>
                      )}
                    </p>
                    {appt.addOns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-0.5">
                        {appt.addOns.map((a) => (
                          <span
                            key={a.id}
                            className="text-xs bg-primary-light text-primary px-1.5 py-0.5 rounded-full"
                          >
                            +{a.name}
                          </span>
                        ))}
                      </div>
                    )}
                    <p className="text-sm text-text-muted mt-1">
                      {formatDateTime(appt.startTime, appt.provider.timezone)} &middot; {formatTime(appt.startTime, appt.provider.timezone)} – {formatTime(appt.endTime, appt.provider.timezone)}
                    </p>
                  </div>
                  <div className="text-right space-y-1">
                    <span
                      className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(appt.status)}`}
                    >
                      {statusLabel(appt.status)}
                    </span>
                    <p className="text-sm font-medium">
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
        </div>
      )}
    </div>
  );
}
