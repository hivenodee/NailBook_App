"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { statusColor, statusLabel, paymentStatusColor } from "@/lib/status-colors";

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
  discountInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  clientPhone: string | null;
  notes: string | null;
  isNewClient: boolean;
  inspirationUrl: string | null;
  service: { name: string; durationMinutes: number; priceInCents: number };
  addOns: { id: string; name: string; priceInCents: number; durationMinutes: number }[];
  client: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
  provider: { businessName: string; slug: string; timezone: string };
  coupon: { code: string; type: string; value: number } | null;
  events: AppointmentEvent[];
  payments: Payment[];
};

function formatDateTime(iso: string, tz: string) {
  return new Date(iso).toLocaleString("en-US", {
    weekday: "short",
    month: "short",
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

export default function AppointmentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const router = useRouter();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [confirmAction, setConfirmAction] = useState<string | null>(null);
  const [balanceLoading, setBalanceLoading] = useState(false);
  const [balanceConfirmCash, setBalanceConfirmCash] = useState(false);

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

  async function handleCollectBalance(action: "send-link" | "mark-cash") {
    setBalanceLoading(true);
    try {
      const res = await fetch(`/api/appointments/${id}/collect-balance`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      if (res.ok) {
        await load();
      } else {
        const json = await res.json().catch(() => ({}));
        console.error("Collect balance error:", res.status, json);
        alert(`Error: ${json.error || res.statusText}`);
      }
    } catch (e) {
      console.error("Collect balance failed:", e);
    } finally {
      setBalanceLoading(false);
      setBalanceConfirmCash(false);
    }
  }

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div className="h-4 bg-border/40 rounded w-16" />
        <div className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer space-y-grid-2">
          <div className="flex justify-between items-start">
            <div className="space-y-2 flex-1">
              <div className="h-5 bg-border/60 rounded w-40" />
              <div className="h-3 bg-border/40 rounded w-20" />
            </div>
            <div className="h-5 bg-border/40 rounded-full w-24" />
          </div>
          <div className="space-y-2">
            <div className="h-3 bg-border/40 rounded w-48" />
            <div className="h-3 bg-border/40 rounded w-36" />
            <div className="h-3 bg-border/40 rounded w-32" />
          </div>
        </div>
      </div>
    );
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
            <h1 className="font-display text-xl">{clientDisplay}</h1>
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
          {appointment.addOns.length > 0 && (
            <div>
              <span className="text-text-muted">Add-ons:</span>{" "}
              {appointment.addOns.map((a) => (
                <span key={a.id} className="inline-block text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full mr-1">
                  {a.name} +${(a.priceInCents / 100).toFixed(2)}
                </span>
              ))}
            </div>
          )}
          <p>
            <span className="text-text-muted">Date:</span>{" "}
            {formatDateTime(appointment.startTime, appointment.provider.timezone)}
          </p>
          <p>
            <span className="text-text-muted">Time:</span>{" "}
            {formatTime(appointment.startTime, appointment.provider.timezone)} – {formatTime(appointment.endTime, appointment.provider.timezone)}
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
          {appointment.discountInCents > 0 && (
            <p className="text-green-700">
              <span>Discount:</span>{" "}
              <span className="font-medium">
                -${(appointment.discountInCents / 100).toFixed(2)}
                {appointment.coupon && ` (${appointment.coupon.code})`}
              </span>
            </p>
          )}
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

      {/* Remaining Balance */}
      {appointment.depositInCents > 0 && (() => {
        const balancePaid = appointment.payments
          .filter((p) => p.type === "BALANCE" && p.status === "COMPLETED")
          .reduce((sum, p) => sum + p.amountInCents, 0);
        const remaining = appointment.totalInCents - appointment.depositInCents - balancePaid;
        const hasBalancePayments = appointment.payments.some((p) => p.type === "BALANCE" && p.status === "COMPLETED");

        if (remaining <= 0 && hasBalancePayments) {
          const balanceMethods = [...new Set(
            appointment.payments
              .filter((p) => p.type === "BALANCE" && p.status === "COMPLETED")
              .map((p) => p.method === "CASH" ? "Cash" : "Card"),
          )];
          return (
            <div className="bg-surface rounded-card p-grid-2 shadow-card">
              <div className="flex items-center gap-2 text-sm text-green-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                </svg>
                <span className="font-medium">
                  Balance Paid — {balanceMethods.join(" / ")}
                </span>
              </div>
            </div>
          );
        }

        if (remaining > 0) {
          return (
            <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
              <div>
                <h2 className="text-sm font-medium text-text-muted">Remaining Balance</h2>
                <p className="font-display text-lg">
                  ${(remaining / 100).toFixed(2)} remaining
                </p>
              </div>
              {balanceConfirmCash ? (
                <div className="space-y-grid-1">
                  <p className="text-sm">
                    Mark ${(remaining / 100).toFixed(2)} as received in cash?
                  </p>
                  <div className="flex gap-grid-1">
                    <button
                      onClick={() => handleCollectBalance("mark-cash")}
                      disabled={balanceLoading}
                      className="text-sm font-medium px-4 py-2 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {balanceLoading ? "..." : "Confirm"}
                    </button>
                    <button
                      onClick={() => setBalanceConfirmCash(false)}
                      className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-grid-1 flex-wrap">
                  <button
                    onClick={() => handleCollectBalance("send-link")}
                    disabled={balanceLoading}
                    className="text-sm font-medium px-4 py-2 rounded-button bg-primary text-white hover:bg-primary-hover transition-colors disabled:opacity-50"
                  >
                    {balanceLoading ? "Sending..." : "Send Payment Link"}
                  </button>
                  <button
                    onClick={() => setBalanceConfirmCash(true)}
                    disabled={balanceLoading}
                    className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors disabled:opacity-50"
                  >
                    Mark as Cash Paid
                  </button>
                </div>
              )}
            </div>
          );
        }

        return null;
      })()}

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
                  className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors"
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
                className="bg-background text-text-secondary border border-border py-2 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => setConfirmAction("no_show")}
                className="bg-background text-text-secondary border border-border py-2 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
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
