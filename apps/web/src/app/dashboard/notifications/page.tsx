"use client";

import React, { useEffect, useState, useCallback } from "react";

// ─── Types ──────────────────────────────────────────

type NotificationChannel = "EMAIL" | "SMS" | "PUSH";
type NotificationStatus = "PENDING" | "SENT" | "DELIVERED" | "FAILED" | "SKIPPED";

type NotificationEntry = {
  id: string;
  templateType: string;
  channel: NotificationChannel;
  status: NotificationStatus;
  title: string;
  body: string;
  sentAt: string | null;
  deliveredAt: string | null;
};

// ─── Constants ──────────────────────────────────────

const STATUS_FILTERS: ("ALL" | NotificationStatus)[] = [
  "ALL",
  "SENT",
  "DELIVERED",
  "FAILED",
  "PENDING",
];

const PAGE_SIZE = 20;

// ─── Badge helpers ──────────────────────────────────

function channelBadgeStyle(channel: NotificationChannel): { backgroundColor: string; color: string } {
  switch (channel) {
    case "EMAIL":
      return { backgroundColor: "var(--bg-muted)", color: "var(--text-tertiary)" };
    case "SMS":
      return { backgroundColor: "rgba(232,164,168,0.1)", color: "var(--primary)" };
    case "PUSH":
      return { backgroundColor: "rgba(212,165,116,0.1)", color: "var(--accent)" };
    default:
      return { backgroundColor: "var(--bg-border)", color: "var(--text-tertiary)" };
  }
}

function statusBadgeStyle(status: NotificationStatus): { backgroundColor: string; color: string } {
  switch (status) {
    case "PENDING":
      return { backgroundColor: "rgba(212,165,116,0.1)", color: "var(--accent)" };
    case "SENT":
      return { backgroundColor: "var(--bg-muted)", color: "var(--text-tertiary)" };
    case "DELIVERED":
      return { backgroundColor: "rgba(212,165,116,0.1)", color: "var(--accent)" };
    case "FAILED":
      return { backgroundColor: "rgba(200,100,100,0.1)", color: "var(--ember-deep)" };
    case "SKIPPED":
      return { backgroundColor: "var(--bg-border)", color: "var(--text-tertiary)" };
    default:
      return { backgroundColor: "var(--bg-border)", color: "var(--text-tertiary)" };
  }
}

function templateLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .toLowerCase()
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function truncate(text: string, max: number): string {
  if (text.length <= max) return text;
  return text.slice(0, max) + "...";
}

// ─── Page Component ─────────────────────────────────

export default function NotificationsPage(): React.JSX.Element {
  const [notifications, setNotifications] = useState<NotificationEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [statusFilter, setStatusFilter] = useState<"ALL" | NotificationStatus>("ALL");
  const [nextCursor, setNextCursor] = useState<string | null>(null);

  const loadNotifications = useCallback(
    async (cursor?: string) => {
      try {
        const statusParam = statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
        const cursorParam = cursor ? `&cursor=${cursor}` : "";
        const res = await fetch(
          `/api/notifications?limit=${PAGE_SIZE}${statusParam}${cursorParam}`
        );
        const json = await res.json();
        const data = json.data;
        if (cursor) {
          setNotifications((prev) => [...prev, ...(data?.notifications || [])]);
        } else {
          setNotifications(data?.notifications || []);
        }
        setNextCursor(data?.nextCursor || null);
      } catch (e) {
        console.error("Failed to load notifications:", e);
      }
    },
    [statusFilter]
  );

  useEffect(() => {
    setLoading(true);
    setNextCursor(null);
    loadNotifications().finally(() => setLoading(false));
  }, [loadNotifications]);

  async function handleLoadMore(): Promise<void> {
    if (!nextCursor) return;
    setLoadingMore(true);
    await loadNotifications(nextCursor);
    setLoadingMore(false);
  }

  function handleStatusFilter(status: "ALL" | NotificationStatus): void {
    setStatusFilter(status);
  }

  // ─── Loading Skeleton ───────────────────────────────

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div>
          <div className="h-7 rounded w-44 mb-2" style={{ backgroundColor: "var(--bg-muted)" }} />
          <div className="h-4 rounded w-64" style={{ backgroundColor: "var(--bg-border)" }} />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 rounded-full w-20" style={{ backgroundColor: "var(--bg-border)" }} />
          ))}
        </div>
        <div className="space-y-grid-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="rounded-[10px] p-grid-2 skeleton-shimmer"
              style={{ backgroundColor: "var(--bg-card)", border: "1px solid var(--bg-border)" }}
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 rounded w-24" style={{ backgroundColor: "var(--bg-muted)" }} />
                    <div className="h-5 rounded-full w-14" style={{ backgroundColor: "var(--bg-border)" }} />
                  </div>
                  <div className="h-3 rounded w-48" style={{ backgroundColor: "var(--bg-border)" }} />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 rounded-full w-20 ml-auto" style={{ backgroundColor: "var(--bg-border)" }} />
                  <div className="h-3 rounded w-24 ml-auto" style={{ backgroundColor: "var(--bg-border)" }} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  // ─── Main Render ────────────────────────────────────

  return (
    <div className="space-y-grid-3">
      <div>
        <div className="flex items-center gap-3">
          <h1 className="font-display text-2xl">Notification History</h1>
          <div className="section-divider" />
        </div>
        <p className="text-sm mt-1" style={{ color: "var(--text-secondary)" }}>
          Track delivery status of all sent notifications
        </p>
      </div>

      {/* Status filter tabs */}
      <div className="flex flex-wrap gap-1">
        {STATUS_FILTERS.map((s) => (
          <button
            key={s}
            onClick={() => handleStatusFilter(s)}
            className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
              statusFilter === s
                ? "bg-ember text-white"
                : ""
            }`}
            style={statusFilter !== s ? { backgroundColor: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" } : undefined}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="rounded-[10px] border-2 border-dashed p-grid-4 text-center" style={{ borderColor: "var(--bg-border)" }}>
          <p className="text-sm" style={{ color: "var(--text-tertiary)" }}>
            No notifications sent yet. Notifications will appear here once
            reminders are sent to your clients.
          </p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="rounded-[10px] p-grid-2 shadow-card"
              style={{ backgroundColor: "var(--bg-card)" }}
            >
              <div className="flex justify-between items-start gap-grid-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {templateLabel(n.templateType)}
                    </span>
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={channelBadgeStyle(n.channel)}
                    >
                      {n.channel}
                    </span>
                  </div>
                  {(n.title || n.body) && (
                    <p className="text-xs mt-1 truncate" style={{ color: "var(--text-tertiary)" }}>
                      {truncate(n.title || n.body, 80)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={statusBadgeStyle(n.status)}
                  >
                    {n.status}
                  </span>
                  {n.sentAt && (
                    <p className="text-xs mt-1" style={{ color: "var(--text-tertiary)" }}>
                      {new Date(n.sentAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        hour: "numeric",
                        minute: "2-digit",
                      })}
                    </p>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Load more */}
      {nextCursor && (
        <div className="flex justify-center">
          <button
            onClick={handleLoadMore}
            disabled={loadingMore}
            className="text-sm font-medium px-4 py-2 rounded-[4px] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            style={{ backgroundColor: "var(--bg-base)", color: "var(--text-secondary)", border: "1px solid var(--bg-border)" }}
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
