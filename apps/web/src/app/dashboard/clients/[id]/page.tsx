"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

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
  PENDING_PAYMENT: "Pending Payment",
  CONFIRMED: "Confirmed",
  COMPLETED: "Completed",
  CANCELLED: "Cancelled",
  NO_SHOW: "No Show",
};

const STATUS_COLORS: Record<string, string> = {
  CONFIRMED: "bg-status-success/10 text-status-success",
  COMPLETED: "bg-status-info/10 text-status-info",
  CANCELLED: "bg-status-error/10 text-status-error",
  PENDING_PAYMENT: "bg-status-warning/10 text-status-warning",
  NO_SHOW: "bg-border/50 text-text-muted",
  DRAFT: "bg-border/50 text-text-muted",
};

export default function ClientDetailPage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [client, setClient] = useState<ClientDetail | null>(null);
  const [loading, setLoading] = useState(true);

  // Notes editing
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

  if (loading) {
    return <p className="text-text-muted text-sm">Loading...</p>;
  }

  if (!client) {
    return (
      <div className="space-y-grid-2">
        <p className="text-text-muted">Client not found.</p>
        <Link href="/dashboard/clients" className="text-primary text-sm hover:underline">
          Back to clients
        </Link>
      </div>
    );
  }

  const confirmedAppts = client.appointments.filter(
    (a) => a.status === "CONFIRMED" || a.status === "COMPLETED"
  );
  const totalSpent = confirmedAppts.reduce((sum, a) => sum + a.totalInCents, 0);

  return (
    <div className="space-y-grid-3 max-w-lg">
      <Link href="/dashboard/clients" className="text-sm text-text-muted hover:text-text-secondary">
        &larr; Back to clients
      </Link>

      {/* Client header */}
      <div className="bg-surface rounded-card p-grid-2 shadow-card">
        <h1 className="text-xl font-semibold">{client.name || "No name"}</h1>
        <p className="text-sm text-text-muted mt-0.5">{client.email}</p>
        {client.phone && (
          <p className="text-sm text-text-muted">{client.phone}</p>
        )}
        <div className="flex gap-grid-3 mt-grid-2">
          <div>
            <p className="text-lg font-semibold">{client.appointments.length}</p>
            <p className="text-xs text-text-muted">
              {client.appointments.length === 1 ? "Visit" : "Visits"}
            </p>
          </div>
          <div>
            <p className="text-lg font-semibold">{formatPrice(totalSpent)}</p>
            <p className="text-xs text-text-muted">Total Spent</p>
          </div>
          <div>
            <p className="text-lg font-semibold">
              {client.appointments[0]
                ? formatDate(client.appointments[0].startTime)
                : "N/A"}
            </p>
            <p className="text-xs text-text-muted">Last Visit</p>
          </div>
        </div>
      </div>

      {/* Internal notes */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
        <p className="text-sm font-medium">Internal Notes</p>
        <p className="text-xs text-text-muted">Only visible to you. Never shown to the client.</p>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="e.g. Prefers gel over acrylic, allergic to acetone..."
          rows={4}
          className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary resize-none"
        />
        <div className="flex items-center gap-grid-2">
          <button
            onClick={handleSaveNotes}
            disabled={savingNotes}
            className="bg-primary text-white py-2 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
          >
            {savingNotes ? "Saving..." : "Save Notes"}
          </button>
          {notesSaved && (
            <span className="text-sm text-green-600 font-medium">Saved</span>
          )}
        </div>
      </section>

      {/* Appointment history */}
      <section className="space-y-grid-2">
        <h2 className="text-lg font-medium">Appointment History</h2>
        {client.appointments.length === 0 ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
            <p className="text-text-muted text-sm">No appointments yet.</p>
          </div>
        ) : (
          <div className="space-y-grid-1">
            {client.appointments.map((appt) => (
              <Link
                key={appt.id}
                href={`/dashboard/appointments/${appt.id}`}
                className="block bg-surface rounded-card p-grid-2 shadow-card hover:shadow-md transition-shadow"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <p className="text-sm font-medium">{appt.service.name}</p>
                    <p className="text-xs text-text-muted mt-0.5">
                      {formatDate(appt.startTime)} at {formatTime(appt.startTime, client.providerTimezone)}
                    </p>
                    {appt.addOns.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {appt.addOns.map((a, i) => (
                          <span key={i} className="text-xs bg-surface-alt text-text-muted px-1.5 py-0.5 rounded-full">
                            {a.name}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${STATUS_COLORS[appt.status] || "bg-border/50 text-text-muted"}`}>
                      {STATUS_LABELS[appt.status] || appt.status}
                    </span>
                    <p className="text-sm font-medium mt-1">
                      {formatPrice(appt.totalInCents)}
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
