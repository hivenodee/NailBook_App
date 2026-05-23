"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type AppointmentRow = {
  id: string;
  startTime: string;
  endTime: string;
  status: string;
  totalInCents: number;
  isNewClient: boolean;
  service: { name: string };
  addOns: { name: string; priceInCents: number }[];
};

type ClientDetail = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  createdAt: string;
  providerTimezone: string;
  appointments: AppointmentRow[];
};

const STATUS_LABELS: Record<string, string> = {
  DRAFT: "Draft",
  PENDING_PAYMENT: "Pending payment",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No show",
};

function statusVariant(status: string): "verified" | "warning" | "error" | "neutral" | "status" {
  if (status === "CONFIRMED") return "verified";
  if (status === "PENDING_PAYMENT") return "warning";
  if (status === "CANCELLED" || status === "NO_SHOW") return "error";
  if (status === "COMPLETED") return "neutral";
  return "status";
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function ClientDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  const [notes, setNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);
  const [notesSaved, setNotesSaved] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/clients/${id}`);
      const json = await res.json();
      if (json.data) {
        setClient(json.data);
        setNotes(json.data.notes || "");
      }
    } catch (e) {
      console.error("Failed to load client:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSaveNotes() {
    setSavingNotes(true);
    setNotesSaved(false);
    try {
      await fetch(`/api/clients/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: notes.trim() || null }),
      });
      setNotesSaved(true);
      setTimeout(() => setNotesSaved(false), 3000);
    } catch (e) {
      console.error("Save notes failed:", e);
    } finally {
      setSavingNotes(false);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-5 w-32 skeleton-shimmer rounded-md" />
        <div className="h-32 skeleton-shimmer rounded-md" />
        <div className="h-48 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  if (!client) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-base text-ink-500">Client not found.</p>
        <Link href="/dashboard/clients" className="text-sm font-sans font-medium text-rust-500 hover:text-rust-600 inline-flex items-center gap-1.5">
          <ArrowLeft size={14} aria-hidden="true" />
          Back to clients
        </Link>
      </div>
    );
  }

  const confirmedAppts = client.appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "COMPLETED",
  );
  const totalSpent = confirmedAppts.reduce((sum, a) => sum + a.totalInCents, 0);

  return (
    <div className="max-w-2xl space-y-8">
      <Link
        href="/dashboard/clients"
        className="inline-flex items-center gap-1.5 text-sm font-sans text-ink-500 hover:text-ink-700 transition-colors"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to clients
      </Link>

      {/* Client header */}
      <Card padding="lg" className="space-y-5">
        <div className="space-y-1">
          <Heading variant="display" className="text-3xl">{client.name || "No name"}</Heading>
          <p className="text-sm font-sans text-ink-500">{client.email}</p>
          {client.phone && (
            <p className="text-sm font-sans text-ink-500">{client.phone}</p>
          )}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 pt-4 border-t border-ink-100">
          <Stat label={client.appointments.length === 1 ? "Visit" : "Visits"}>
            {client.appointments.length}
          </Stat>
          <Stat label="Total spent">{formatPrice(totalSpent)}</Stat>
          <Stat label="Last visit">
            {client.appointments[0] ? formatDate(client.appointments[0].startTime) : "—"}
          </Stat>
        </div>
      </Card>

      {/* Internal notes */}
      <Card padding="lg" className="space-y-3">
        <div>
          <p className="text-sm font-sans font-medium text-ink-900">Internal notes</p>
          <p className="text-xs font-sans text-ink-500 mt-0.5">
            Only visible to you. Never shown to the client.
          </p>
        </div>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Prefers gel over acrylic, allergic to acetone…"
          rows={4}
          className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-none"
        />
        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="sm"
            onClick={handleSaveNotes}
            disabled={savingNotes}
          >
            {savingNotes ? "Saving…" : "Save notes"}
          </Button>
          {notesSaved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-sans text-success">
              <Check size={14} aria-hidden="true" />
              Saved
            </span>
          )}
        </div>
      </Card>

      {/* Appointment history */}
      <section className="space-y-4">
        <Heading variant="h3" className="text-2xl">Appointment history</Heading>
        {client.appointments.length === 0 ? (
          <Card padding="lg" className="border-dashed">
            <p className="text-center text-sm font-sans text-ink-500">No appointments yet.</p>
          </Card>
        ) : (
          <div className="space-y-3">
            {client.appointments.map((appt) => (
              <Link
                key={appt.id}
                href={`/dashboard/appointments/${appt.id}`}
                className="block"
              >
                <Card padding="lg" hoverLift>
                  <div className="flex justify-between items-start gap-4">
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-sans font-medium text-ink-900">{appt.service.name}</p>
                      <p className="text-xs font-sans text-ink-500 mt-0.5">
                        {formatDate(appt.startTime)} at {formatTime(appt.startTime, client.providerTimezone)}
                      </p>
                      {appt.addOns.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-2">
                          {appt.addOns.map((a, i) => (
                            <span
                              key={i}
                              className="text-xs font-sans rounded-pill bg-cream-100 text-ink-700 border border-ink-200 px-2.5 py-0.5"
                            >
                              {a.name}
                            </span>
                          ))}
                        </div>
                      )}
                    </div>
                    <div className="text-right shrink-0 space-y-1.5">
                      <Badge variant={statusVariant(appt.status)}>
                        {STATUS_LABELS[appt.status] || appt.status}
                      </Badge>
                      <p className="text-sm font-sans font-medium text-ink-900">
                        {formatPrice(appt.totalInCents)}
                      </p>
                    </div>
                  </div>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div>
      <p className="font-display text-2xl text-ink-900 leading-none">{children}</p>
      <p className="text-xs font-sans text-ink-500 mt-1">{label}</p>
    </div>
  );
}
