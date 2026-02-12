"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";

type AppointmentEvent = {
  id: string;
  type: string;
  actorType: string | null;
  createdAt: string;
  metadata: Record<string, unknown> | null;
};

type Payment = {
  id: string;
  amountInCents: number;
  type: string;
  status: string;
  method: string;
  createdAt: string;
};

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  isNewClient: boolean;
  inspirationUrl: string | null;
  service: { name: string; durationMinutes: number; priceInCents: number };
  client: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
  provider: { businessName: string; slug: string };
  events: AppointmentEvent[];
  payments: Payment[];
};

function formatDateTime(iso: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
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

function paymentStatusColor(status: string) {
  switch (status) {
    case "COMPLETED":
      return "bg-green-100 text-green-800";
    case "PENDING":
      return "bg-yellow-100 text-yellow-800";
    case "FAILED":
      return "bg-red-100 text-red-800";
    case "REFUNDED":
      return "bg-gray-100 text-gray-800";
    default:
      return "bg-gray-100 text-gray-700";
  }
}

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/${id}`);
      const json = await res.json();
      setAppointment(json.data);
    } catch (e) {
      console.error("Failed to load appointment:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleAction(action: string) {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await load();
      }
    } catch (e) {
      console.error("Action failed:", e);
    } finally {
      setActionLoading(false);
      setConfirmAction(null);
    }
  }

  if (loading) {
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  if (!appointment) {
    return (
      <div className="space-y-grid-2">
        <p className="text-text-muted">Appointment not found.</p>
        <Link href="/dashboard" className="text-primary text-sm hover:underline">
          Back to dashboard
        </Link>
      </div>
    );
  }

  const clientDisplay =
    appointment.client.firstName
      ? `${appointment.client.firstName} ${appointment.client.lastName || ""}`.trim()
      : appointment.clientName || appointment.clientEmail || "Client";

  const isActive = ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status);

  return (
    <div className="space-y-grid-3">
      <Link href="/dashboard" className="text-sm text-text-muted hover:text-text-secondary">
        &larr; Back
      </Link>

      {/* Header */}
      <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <div className="flex justify-between items-start">
          <div>
            <h1 className="text-xl font-semibold">{clientDisplay}</h1>
            {appointment.isNewClient && (
              <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
                New client
              </span>
            )}
          </div>
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusColor(appointment.status)}`}
          >
            {statusLabel(appointment.status)}
          </span>
        </div>

        <div className="space-y-1 text-sm">
          <p>
            <span className="text-text-muted">Service:</span>{" "}
            {appointment.service.name}
          </p>
          <p>
            <span className="text-text-muted">Date:</span>{" "}
            {formatDateTime(appointment.startTime)}
          </p>
          <p>
            <span className="text-text-muted">Time:</span>{" "}
            {formatTime(appointment.startTime)} – {formatTime(appointment.endTime)}
          </p>
          <p>
            <span className="text-text-muted">Duration:</span>{" "}
            {appointment.service.durationMinutes} min
          </p>
          {appointment.clientEmail && (
            <p>
              <span className="text-text-muted">Email:</span>{" "}
              {appointment.clientEmail}
            </p>
          )}
          {appointment.clientPhone && (
            <p>
              <span className="text-text-muted">Phone:</span>{" "}
              {appointment.clientPhone}
            </p>
          )}
          {appointment.notes && (
            <p>
              <span className="text-text-muted">Notes:</span>{" "}
              {appointment.notes}
            </p>
          )}
          {appointment.inspirationUrl && (
            <div>
              <span className="text-text-muted">Inspiration:</span>{" "}
              <img
                src={appointment.inspirationUrl}
                alt="Inspiration"
                className="mt-1 w-32 h-32 object-cover rounded-card"
              />
            </div>
          )}
        </div>

        {/* Payment info */}
        <div className="border-t border-border pt-grid-1 space-y-1 text-sm">
          <p>
            <span className="text-text-muted">Total:</span>{" "}
            <span className="font-medium">
              ${(appointment.totalInCents / 100).toFixed(2)}
            </span>
          </p>
          {appointment.depositInCents > 0 && (
            <>
              <p>
                <span className="text-text-muted">Deposit:</span>{" "}
                ${(appointment.depositInCents / 100).toFixed(2)}
              </p>
              <p>
                <span className="text-text-muted">Remaining:</span>{" "}
                ${((appointment.totalInCents - appointment.depositInCents) / 100).toFixed(2)}
              </p>
            </>
          )}
        </div>
      </div>

      {/* Actions */}
      {isActive && (
        <div className="bg-surface rounded-card p-grid-2 shadow-card">
          {confirmAction ? (
            <div className="space-y-grid-1">
              <p className="text-sm font-medium">
                Are you sure you want to{" "}
                {confirmAction === "cancel"
                  ? "cancel this appointment"
                  : confirmAction === "no_show"
                  ? "mark this as a no-show"
                  : "complete this appointment"}
                ?
              </p>
              <div className="flex gap-grid-1">
                <button
                  onClick={() => handleAction(confirmAction)}
                  disabled={actionLoading}
                  className={`text-sm font-medium px-4 py-2 rounded-button transition-colors ${
                    confirmAction === "cancel" || confirmAction === "no_show"
                      ? "bg-red-600 text-white hover:bg-red-700"
                      : "bg-primary text-white hover:bg-primary-hover"
                  }`}
                >
                  {actionLoading ? "..." : "Confirm"}
                </button>
                <button
                  onClick={() => setConfirmAction(null)}
                  className="text-sm font-medium px-4 py-2 rounded-button bg-gray-100 text-gray-700 hover:bg-gray-200 transition-colors"
                >
                  Go back
                </button>
              </div>
            </div>
          ) : (
            <div className="flex gap-grid-1 flex-wrap">
              <button
                onClick={() => setConfirmAction("complete")}
                className="bg-primary text-white py-2 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors"
              >
                Complete
              </button>
              <button
                onClick={() => setConfirmAction("cancel")}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-button text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmAction("no_show")}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-button text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                No-Show
              </button>
            </div>
          )}
        </div>
      )}

      {/* Payments */}
      {appointment.payments.length > 0 && (
        <section className="space-y-grid-1">
          <h2 className="text-lg font-medium">Payments</h2>
          {appointment.payments.map((p) => (
            <div
              key={p.id}
              className="bg-surface rounded-card p-grid-2 shadow-card flex justify-between items-center text-sm"
            >
              <div>
                <span className="font-medium">
                  ${(p.amountInCents / 100).toFixed(2)}
                </span>
                <span className="text-text-muted ml-2">{p.type}</span>
                <span className="text-text-muted ml-2">{p.method.replace(/_/g, " ")}</span>
              </div>
              <span
                className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentStatusColor(p.status)}`}
              >
                {p.status}
              </span>
            </div>
          ))}
        </section>
      )}

      {/* Activity log */}
      <section className="space-y-grid-1">
        <h2 className="text-lg font-medium">Activity</h2>
        <div className="bg-surface rounded-card p-grid-2 shadow-card">
          {appointment.events.length === 0 ? (
            <p className="text-text-muted text-sm">No activity yet.</p>
          ) : (
            <ul className="space-y-2">
              {appointment.events.map((event) => (
                <li key={event.id} className="flex justify-between text-sm">
                  <span>
                    <span className="font-medium capitalize">
                      {event.type.replace(/_/g, " ")}
                    </span>
                    {event.actorType && (
                      <span className="text-text-muted ml-1">
                        by {event.actorType}
                      </span>
                    )}
                  </span>
                  <span className="text-text-muted">
                    {new Date(event.createdAt).toLocaleString("en-US", {
                      month: "short",
                      day: "numeric",
                      hour: "numeric",
                      minute: "2-digit",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </section>
    </div>
  );
}
