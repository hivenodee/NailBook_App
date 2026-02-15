"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";

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
  addOns: { id: string; name: string; priceInCents: number }[];
  client: { firstName: string | null; lastName: string | null };
  provider: { businessName: string; slug: string };
};

type StatusFilter = "ALL" | "COMPLETED" | "CANCELLED" | "NO_SHOW" | "CONFIRMED" | "PENDING_PAYMENT";

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: "UTC",
  });
}

function statusColor(status: string) {
  switch (status) {
    case "CONFIRMED":
      return "bg-green-100 text-green-800";
    case "PENDING_PAYMENT":
      return "bg-yellow-100 text-yellow-800";
    case "COMPLETED":
      return "bg-blue-100 text-blue-800";
    case "CANCELLED":
      return "bg-red-100 text-red-800";
    case "NO_SHOW":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

function statusLabel(status: string) {
  return status.replace(/_/g, " ");
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
        // Fetch all statuses in parallel
        const statuses = ["CONFIRMED", "PENDING_PAYMENT", "COMPLETED", "CANCELLED", "NO_SHOW"];
        const responses = await Promise.all(
          statuses.map((s) => fetch(`/api/appointments?status=${s}`))
        );
        const jsons = await Promise.all(responses.map((r) => r.json()));
        const all = jsons
          .flatMap((j) => j.data || [])
          .sort(
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

  return (
    <div className="space-y-grid-3">
      <h1 className="text-2xl font-semibold">Appointment History</h1>

      {/* Filters */}
      <div className="flex gap-1.5 overflow-x-auto pb-1">
        {FILTERS.map((f) => (
          <button
            key={f.value}
            onClick={() => setFilter(f.value)}
            className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors whitespace-nowrap ${
              filter === f.value
                ? "bg-primary text-white"
                : "bg-gray-100 text-gray-700 hover:bg-gray-200"
            }`}
          >
            {f.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-text-muted text-sm">Loading...</div>
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

            return (
              <Link
                key={appt.id}
                href={`/dashboard/appointments/${appt.id}`}
                className="block bg-surface rounded-card p-grid-2 shadow-card hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="font-medium">{clientDisplay}</p>
                    <p className="text-sm text-text-muted">{appt.service.name}</p>
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
                      {formatDateTime(appt.startTime)} &middot; {formatTime(appt.startTime)} – {formatTime(appt.endTime)}
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
