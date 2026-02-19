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

function channelBadgeColor(channel: NotificationChannel): string {
  switch (channel) {
    case "EMAIL":
      return "bg-blue-50 text-blue-700";
    case "SMS":
      return "bg-purple-50 text-purple-700";
    case "PUSH":
      return "bg-green-50 text-green-700";
    default:
      return "bg-border/40 text-text-muted";
  }
}

function statusBadgeColor(status: NotificationStatus): string {
  switch (status) {
    case "PENDING":
      return "bg-yellow-50 text-yellow-700";
    case "SENT":
      return "bg-blue-50 text-blue-700";
    case "DELIVERED":
      return "bg-green-50 text-green-700";
    case "FAILED":
      return "bg-red-50 text-red-700";
    case "SKIPPED":
      return "bg-border/40 text-text-muted";
    default:
      return "bg-border/40 text-text-muted";
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
          <div className="h-7 bg-border/60 rounded w-44 mb-2" />
          <div className="h-4 bg-border/40 rounded w-64" />
        </div>
        <div className="flex gap-1">
          {[0, 1, 2, 3, 4].map((i) => (
            <div key={i} className="h-8 bg-border/40 rounded-full w-20" />
          ))}
        </div>
        <div className="space-y-grid-1">
          {[0, 1, 2, 3, 4, 5].map((i) => (
            <div
              key={i}
              className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer"
            >
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="h-4 bg-border/60 rounded w-24" />
                    <div className="h-5 bg-border/40 rounded-full w-14" />
                  </div>
                  <div className="h-3 bg-border/40 rounded w-48" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-5 bg-border/40 rounded-full w-20 ml-auto" />
                  <div className="h-3 bg-border/40 rounded w-24 ml-auto" />
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
        <h1 className="font-display text-2xl">Notification History</h1>
        <p className="text-text-secondary text-sm mt-1">
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
                ? "bg-primary text-white"
                : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
            }`}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* Notification list */}
      {notifications.length === 0 ? (
        <div className="rounded-card border-2 border-dashed border-border p-grid-4 text-center">
          <p className="text-text-muted text-sm">
            No notifications sent yet. Notifications will appear here once
            reminders are sent to your clients.
          </p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {notifications.map((n) => (
            <div
              key={n.id}
              className="bg-surface rounded-card p-grid-2 shadow-card"
            >
              <div className="flex justify-between items-start gap-grid-1">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-medium text-sm">
                      {templateLabel(n.templateType)}
                    </span>
                    <span
                      className={`text-[10px] font-medium px-2 py-0.5 rounded-full ${channelBadgeColor(n.channel)}`}
                    >
                      {n.channel}
                    </span>
                  </div>
                  {(n.title || n.body) && (
                    <p className="text-text-muted text-xs mt-1 truncate">
                      {truncate(n.title || n.body, 80)}
                    </p>
                  )}
                </div>
                <div className="text-right flex-shrink-0">
                  <span
                    className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusBadgeColor(n.status)}`}
                  >
                    {n.status}
                  </span>
                  {n.sentAt && (
                    <p className="text-text-muted text-xs mt-1">
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
            className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loadingMore ? "Loading..." : "Load More"}
          </button>
        </div>
      )}
    </div>
  );
}
