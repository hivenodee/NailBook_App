"use client";

import React, { useState, useEffect, useCallback } from "react";

type WaitlistEntry = {
  id: string;
  clientName: string;
  clientEmail: string;
  clientPhone: string | null;
  targetDate: string;
  targetTime: string | null;
  timePreference: "ANY" | "MORNING" | "AFTERNOON" | "EVENING";
  status: "ACTIVE" | "AVAILABLE" | "NOTIFIED" | "BOOKED" | "EXPIRED" | "CANCELLED";
  notifyCount: number;
  lastNotifiedAt: string | null;
  createdAt: string;
  service: { id: string; name: string } | null;
};

type StatusTab = "ACTIVE" | "AVAILABLE" | "NOTIFIED" | "EXPIRED" | "ALL";

const STATUS_TABS: { label: string; value: StatusTab }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Notified", value: "NOTIFIED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "All", value: "ALL" },
];

const STATUS_COLORS: Record<string, string> = {
  ACTIVE: "bg-green-50 text-green-700",
  AVAILABLE: "bg-amber-50 text-amber-700",
  NOTIFIED: "bg-blue-50 text-blue-700",
  BOOKED: "bg-purple-50 text-purple-700",
  EXPIRED: "bg-gray-100 text-gray-600",
  CANCELLED: "bg-red-50 text-red-700",
};

const TIME_PREF_LABELS: Record<string, string> = {
  ANY: "Any time",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSlotTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function WaitlistDashboardPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<StatusTab>("ACTIVE");
  const [entries, setEntries] = useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [approvingId, setApprovingId] = useState<string | null>(null);

  const fetchEntries = useCallback(async () => {
    setLoading(true);
    try {
      const statusParam = activeTab !== "ALL" ? `&status=${activeTab}` : "";
      const res = await fetch(`/api/waitlist/entries?page=${page}${statusParam}`);
      const json = await res.json();
      if (json.data) {
        setEntries(json.data.entries);
        setTotalPages(json.data.totalPages);
        setTotal(json.data.total);
      }
    } catch {
      setEntries([]);
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  useEffect(() => {
    setPage(1);
  }, [activeTab]);

  useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleRemove(id: string) {
    if (!confirm("Remove this waitlist entry?")) return;
    try {
      const res = await fetch(`/api/waitlist/entries/${id}`, { method: "DELETE" });
      if (res.ok) {
        fetchEntries();
      }
    } catch {
      alert("Failed to remove entry");
    }
  }

  async function handleApprove(id: string) {
    setApprovingId(id);
    try {
      const res = await fetch(`/api/waitlist/entries/${id}/approve`, { method: "POST" });
      if (res.ok) {
        fetchEntries();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Failed to approve entry");
      }
    } catch {
      alert("Failed to approve entry");
    } finally {
      setApprovingId(null);
    }
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Waitlist</h1>

      {/* Status tabs */}
      <div className="flex gap-2 overflow-x-auto">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.value}
            onClick={() => setActiveTab(tab.value)}
            className={`px-4 py-2 rounded-button text-sm font-medium transition-colors ${
              activeTab === tab.value
                ? "bg-primary text-white"
                : "bg-surface text-text-secondary border border-border hover:border-primary/40"
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-grid-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-border/60 rounded w-28" />
                    <div className="h-5 bg-border/40 rounded-full w-16" />
                  </div>
                  <div className="h-3 bg-border/40 rounded w-36" />
                </div>
                <div className="h-7 bg-border/40 rounded-button w-16" />
              </div>
              <div className="mt-2 flex gap-4">
                <div className="h-3 bg-border/40 rounded w-20" />
                <div className="h-3 bg-border/40 rounded w-24" />
              </div>
            </div>
          ))}
        </div>
      ) : entries.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-4 shadow-card text-center">
          <p className="text-text-muted text-sm">No waitlist entries found.</p>
        </div>
      ) : (
        <div className="space-y-grid-2">
          <p className="text-xs text-text-muted">{total} {total === 1 ? "entry" : "entries"}</p>

          {entries.map((entry) => (
            <div key={entry.id} className="bg-surface rounded-card p-grid-2 shadow-card">
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">{entry.clientName}</span>
                    <span className={`text-xs px-2 py-0.5 rounded-full ${STATUS_COLORS[entry.status]}`}>
                      {entry.status}
                    </span>
                  </div>
                  <p className="text-xs text-text-muted mt-0.5 truncate">{entry.clientEmail}</p>
                  {entry.clientPhone && (
                    <p className="text-xs text-text-muted truncate">{entry.clientPhone}</p>
                  )}
                </div>
                <div className="flex items-center gap-2 flex-shrink-0">
                  {entry.status === "AVAILABLE" && (
                    <button
                      onClick={() => handleApprove(entry.id)}
                      disabled={approvingId === entry.id}
                      className="text-xs bg-primary text-white px-3 py-1.5 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {approvingId === entry.id ? "Approving..." : "Approve"}
                    </button>
                  )}
                  <button
                    onClick={() => handleRemove(entry.id)}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              </div>

              <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-text-muted">
                <span>Date: <span className="text-text-secondary">{formatDate(entry.targetDate)}</span></span>
                {entry.targetTime ? (
                  <span>Slot: <span className="text-text-secondary">{formatSlotTime(entry.targetTime)}</span></span>
                ) : (
                  <span>Time: <span className="text-text-secondary">{TIME_PREF_LABELS[entry.timePreference]}</span></span>
                )}
                {entry.service && (
                  <span>Service: <span className="text-text-secondary">{entry.service.name}</span></span>
                )}
                {entry.notifyCount > 0 && (
                  <span>Notified: <span className="text-text-secondary">{entry.notifyCount}x</span></span>
                )}
              </div>
            </div>
          ))}

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-center gap-2 pt-grid-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 rounded-button text-sm border border-border hover:border-primary/40 disabled:opacity-50"
              >
                Previous
              </button>
              <span className="text-sm text-text-muted">
                Page {page} of {totalPages}
              </span>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 rounded-button text-sm border border-border hover:border-primary/40 disabled:opacity-50"
              >
                Next
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
