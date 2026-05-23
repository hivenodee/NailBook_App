"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { ArrowLeft, RefreshCw, Check } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

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

type IntakeResponseData = {
  id: string;
  answer: string;
  question: { label: string; type: string };
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
  recurrenceGroupId: string | null;
  recurrenceIndex: number | null;
  service: { name: string; durationMinutes: number; priceInCents: number };
  addOns: { id: string; name: string; priceInCents: number; durationMinutes: number }[];
  client: { firstName: string | null; lastName: string | null; avatarUrl: string | null };
  provider: { businessName: string; slug: string; timezone: string };
  coupon: { code: string; type: string; value: number } | null;
  events: AppointmentEvent[];
  payments: Payment[];
  intakeResponses?: IntakeResponseData[];
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

function statusVariant(status: string): "verified" | "warning" | "error" | "neutral" | "status" {
  if (status === "CONFIRMED") return "verified";
  if (status === "PENDING_PAYMENT" || status === "PENDING") return "warning";
  if (status === "CANCELLED" || status === "NO_SHOW" || status === "FAILED") return "error";
  if (status === "COMPLETED") return "neutral";
  return "status";
}

function statusLabel(status: string): string {
  return status
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function paymentVariant(status: string): "verified" | "warning" | "error" | "neutral" {
  if (status === "COMPLETED") return "verified";
  if (status === "PENDING") return "warning";
  if (status === "FAILED") return "error";
  return "neutral";
}

export default function AppointmentDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
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
      if (res.ok) await load();
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
      <div className="max-w-2xl space-y-6">
        <div className="h-5 w-20 skeleton-shimmer rounded-md" />
        <div className="h-48 skeleton-shimmer rounded-md" />
        <div className="h-32 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  if (!appointment) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-base text-ink-500">Appointment not found.</p>
        <Link href="/dashboard" className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-rust-500 hover:text-rust-600">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to dashboard
        </Link>
      </div>
    );
  }

  const clientDisplay = appointment.client.firstName
    ? `${appointment.client.firstName} ${appointment.client.lastName || ""}`.trim()
    : appointment.clientName || appointment.clientEmail || "Client";

  const isActive = ["CONFIRMED", "PENDING_PAYMENT"].includes(appointment.status);

  return (
    <div className="max-w-2xl space-y-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm font-sans text-ink-500 hover:text-ink-700 transition-colors"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back
      </Link>

      {/* Header */}
      <Card padding="lg" className="space-y-5">
        <div className="flex justify-between items-start gap-4">
          <div className="space-y-1">
            <Heading variant="display" className="text-3xl">{clientDisplay}</Heading>
            {appointment.isNewClient && <Badge variant="verified">New client</Badge>}
          </div>
          <Badge variant={statusVariant(appointment.status)}>
            {statusLabel(appointment.status)}
          </Badge>
        </div>

        <dl className="space-y-2 text-sm font-sans">
          <Row label="Service">{appointment.service.name}</Row>
          {appointment.addOns.length > 0 && (
            <Row label="Add-ons">
              <span className="flex flex-wrap gap-1.5 justify-end">
                {appointment.addOns.map((a) => (
                  <span
                    key={a.id}
                    className="rounded-pill bg-cream-100 text-ink-700 border border-ink-200 px-2.5 py-0.5 text-xs"
                  >
                    {a.name} +${(a.priceInCents / 100).toFixed(2)}
                  </span>
                ))}
              </span>
            </Row>
          )}
          <Row label="Date">{formatDateTime(appointment.startTime, appointment.provider.timezone)}</Row>
          <Row label="Time">
            {formatTime(appointment.startTime, appointment.provider.timezone)} –{" "}
            {formatTime(appointment.endTime, appointment.provider.timezone)}
          </Row>
          <Row label="Duration">{appointment.service.durationMinutes} min</Row>
          {appointment.clientEmail && <Row label="Email">{appointment.clientEmail}</Row>}
          {appointment.clientPhone && <Row label="Phone">{appointment.clientPhone}</Row>}
          {appointment.notes && <Row label="Notes">{appointment.notes}</Row>}
        </dl>

        {appointment.inspirationUrl && (
          <div className="space-y-1.5">
            <p className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500">
              Inspiration
            </p>
            <div className="relative w-32 h-32">
              <Image
                src={appointment.inspirationUrl}
                alt="Inspiration"
                fill
                className="object-cover rounded-md border border-ink-200"
                unoptimized
                sizes="128px"
              />
            </div>
          </div>
        )}

        {/* Payment info */}
        <dl className="pt-4 space-y-2 text-sm font-sans border-t border-ink-100">
          {appointment.discountInCents > 0 && (
            <Row label="Discount">
              <span className="text-success font-medium">
                −${(appointment.discountInCents / 100).toFixed(2)}
                {appointment.coupon && ` (${appointment.coupon.code})`}
              </span>
            </Row>
          )}
          <Row label="Total">
            <span className="font-display text-base">
              ${(appointment.totalInCents / 100).toFixed(2)}
            </span>
          </Row>
          {appointment.depositInCents > 0 && (
            <>
              <Row label="Deposit">${(appointment.depositInCents / 100).toFixed(2)}</Row>
              <Row label="Remaining">
                ${((appointment.totalInCents - appointment.depositInCents) / 100).toFixed(2)}
              </Row>
            </>
          )}
        </dl>
      </Card>

      {/* Recurring series info */}
      {appointment.recurrenceGroupId && appointment.recurrenceIndex !== null && (
        <Card padding="md" className="flex items-center gap-2 text-sm font-sans">
          <RefreshCw size={14} className="text-ink-500" aria-hidden="true" />
          <span className="text-ink-700">
            Part of a recurring series (appointment {appointment.recurrenceIndex + 1})
          </span>
        </Card>
      )}

      {/* Intake Responses */}
      {appointment.intakeResponses && appointment.intakeResponses.length > 0 && (
        <section className="space-y-3">
          <Heading variant="h4" className="text-lg">Intake responses</Heading>
          <Card padding="lg" className="space-y-3">
            {appointment.intakeResponses.map((r) => {
              let displayAnswer = r.answer;
              if (r.question.type === "CHECKBOX") {
                try {
                  const arr = JSON.parse(r.answer) as string[];
                  displayAnswer = arr.join(", ");
                } catch {
                  // use raw answer
                }
              }
              return (
                <div key={r.id} className="space-y-0.5">
                  <p className="text-xs font-sans text-ink-500">{r.question.label}</p>
                  <p className="text-sm font-sans font-medium text-ink-900">{displayAnswer}</p>
                </div>
              );
            })}
          </Card>
        </section>
      )}

      {/* Remaining Balance */}
      {appointment.depositInCents > 0 && (() => {
        const balancePaid = appointment.payments
          .filter((p) => p.type === "BALANCE" && p.status === "COMPLETED")
          .reduce((sum, p) => sum + p.amountInCents, 0);
        const remaining = appointment.totalInCents - appointment.depositInCents - balancePaid;
        const hasBalancePayments = appointment.payments.some(
          (p) => p.type === "BALANCE" && p.status === "COMPLETED",
        );

        if (remaining <= 0 && hasBalancePayments) {
          const balanceMethods = [
            ...new Set(
              appointment.payments
                .filter((p) => p.type === "BALANCE" && p.status === "COMPLETED")
                .map((p) => (p.method === "CASH" ? "Cash" : "Card")),
            ),
          ];
          return (
            <Card padding="md">
              <div className="flex items-center gap-2 text-sm font-sans text-success">
                <Check size={18} aria-hidden="true" />
                <span className="font-medium">
                  Balance paid · {balanceMethods.join(" / ")}
                </span>
              </div>
            </Card>
          );
        }

        if (remaining > 0) {
          return (
            <Card padding="lg" className="space-y-4">
              <div>
                <p className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500">
                  Remaining balance
                </p>
                <p className="font-display text-2xl text-ink-900 mt-1">
                  ${(remaining / 100).toFixed(2)} remaining
                </p>
              </div>
              {balanceConfirmCash ? (
                <div className="space-y-3">
                  <p className="text-sm font-sans text-ink-700">
                    Mark ${(remaining / 100).toFixed(2)} as received in cash?
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      onClick={() => handleCollectBalance("mark-cash")}
                      disabled={balanceLoading}
                    >
                      {balanceLoading ? "…" : "Confirm"}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => setBalanceConfirmCash(false)}
                    >
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2 flex-wrap">
                  <Button
                    variant="primary"
                    size="sm"
                    onClick={() => handleCollectBalance("send-link")}
                    disabled={balanceLoading}
                  >
                    {balanceLoading ? "Sending…" : "Send payment link"}
                  </Button>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setBalanceConfirmCash(true)}
                    disabled={balanceLoading}
                  >
                    Mark as cash paid
                  </Button>
                </div>
              )}
            </Card>
          );
        }

        return null;
      })()}

      {/* Actions */}
      {isActive && (
        <Card padding="lg">
          {confirmAction ? (
            <div className="space-y-4">
              <p className="text-sm font-sans font-medium text-ink-900">
                Are you sure you want to{" "}
                {confirmAction === "cancel"
                  ? "cancel this appointment"
                  : confirmAction === "no_show"
                  ? "mark this as a no-show"
                  : "complete this appointment"}
                ?
              </p>
              <div className="flex gap-2">
                <Button
                  variant="primary"
                  size="sm"
                  onClick={() => handleAction(confirmAction)}
                  disabled={actionLoading}
                >
                  {actionLoading ? "…" : "Confirm"}
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setConfirmAction(null)}
                >
                  Go back
                </Button>
              </div>
            </div>
          ) : (
            <div className="flex gap-2 flex-wrap">
              <Button variant="primary" size="sm" onClick={() => setConfirmAction("complete")}>
                Complete
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction("cancel")}>
                Cancel
              </Button>
              <Button variant="secondary" size="sm" onClick={() => setConfirmAction("no_show")}>
                No-show
              </Button>
            </div>
          )}
        </Card>
      )}

      {/* Payments */}
      {appointment.payments.length > 0 && (
        <section className="space-y-3">
          <Heading variant="h4" className="text-lg">Payments</Heading>
          <div className="space-y-2">
            {appointment.payments.map((p) => (
              <Card key={p.id} padding="md">
                <div className="flex justify-between items-center text-sm font-sans">
                  <div>
                    <span className="font-medium text-ink-900">
                      ${(p.amountInCents / 100).toFixed(2)}
                    </span>
                    <span className="ml-2 text-ink-500">{p.type}</span>
                    <span className="ml-2 text-ink-500">{p.method.replace(/_/g, " ")}</span>
                  </div>
                  <Badge variant={paymentVariant(p.status)}>{p.status}</Badge>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {/* Activity log */}
      <section className="space-y-3">
        <Heading variant="h4" className="text-lg">Activity</Heading>
        <Card padding="lg">
          {appointment.events.length === 0 ? (
            <p className="text-sm font-sans text-ink-500">No activity yet.</p>
          ) : (
            <ul className="space-y-2.5">
              {appointment.events.map((event) => (
                <li key={event.id} className="flex justify-between text-sm font-sans">
                  <span>
                    <span className="font-medium text-ink-900 capitalize">
                      {event.type.replace(/_/g, " ")}
                    </span>
                    {event.actorType && (
                      <span className="ml-1 text-ink-500">by {event.actorType}</span>
                    )}
                  </span>
                  <span className="text-ink-500 shrink-0 ml-4">
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
        </Card>
      </section>
    </div>
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
    <div className="flex justify-between gap-4">
      <dt className="text-ink-500 shrink-0">{label}</dt>
      <dd className="text-ink-900 font-medium text-right min-w-0">{children}</dd>
    </div>
  );
}
