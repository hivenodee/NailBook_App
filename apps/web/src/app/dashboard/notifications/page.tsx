"use client";

import React, { useEffect, useState, useCallback } from "react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

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

const CHANNEL_LABELS: Record<NotificationChannel, string> = {
  EMAIL: "Email",
  SMS: "SMS",
  PUSH: "Push",
};

function statusBadge(status: NotificationStatus): {
  variant: BadgeProps["variant"];
  label: string;
} {
  switch (status) {
    case "PENDING":
      return { variant: "warning", label: "Pending" };
    case "SENT":
      return { variant: "neutral", label: "Sent" };
    case "DELIVERED":
      return { variant: "verified", label: "Delivered" };
    case "FAILED":
      return { variant: "error", label: "Failed" };
    case "SKIPPED":
      return { variant: "status", label: "Skipped" };
    default:
      return { variant: "neutral", label: status };
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
  const [hasLoaded, setHasLoaded] = useState(false);
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
    loadNotifications().finally(() => {
      setLoading(false);
      setHasLoaded(true);
    });
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

  const isEmpty = !loading && notifications.length === 0 && statusFilter === "ALL";

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="space-y-3">
        <p className="text-label text-ink-500">Notifications &middot; Delivery history</p>
        <Heading variant="display" className="text-3xl md:text-4xl">
          Notification history
        </Heading>
        <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
          Every message sent to your clients, and whether it arrived.
        </p>
      </header>

      {/* ─── Status filter chips ─── */}
      <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
        {STATUS_FILTERS.map((s) => (
          <FilterChip
            key={s}
            active={statusFilter === s}
            onClick={() => handleStatusFilter(s)}
          >
            {s === "ALL" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </FilterChip>
        ))}
      </div>

      {/* ─── Notification list ─── */}
      {loading && !hasLoaded ? (
        <RowSkeleton />
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed border-ink-200 px-6 py-12 text-center">
          <p className="font-sans text-sm text-ink-500 max-w-sm mx-auto leading-relaxed">
            No notifications yet. They will appear here once reminders go out to
            your clients.
          </p>
        </div>
      ) : notifications.length === 0 ? (
        <p className="font-sans text-sm text-ink-500">No matching notifications.</p>
      ) : (
        <div
          className={cn(
            "transition-opacity duration-200",
            loading && "opacity-60 pointer-events-none",
          )}
        >
          <ul className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-cream-50">
            {notifications.map((n) => (
              <NotificationRow key={n.id} entry={n} />
            ))}
          </ul>
        </div>
      )}

      {/* ─── Load more ─── */}
      {nextCursor && !loading && (
        <div className="flex justify-center">
          <Button
            type="button"
            variant="secondary"
            size="sm"
            onClick={handleLoadMore}
            disabled={loadingMore}
          >
            {loadingMore ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Sub-components ─────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 h-9 rounded-pill border px-4 font-sans text-sm whitespace-nowrap transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        active
          ? "bg-rust-500 text-cream-50 border-rust-500"
          : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
      )}
    >
      {children}
    </button>
  );
}

function NotificationRow({ entry }: { entry: NotificationEntry }): React.JSX.Element {
  const badge = statusBadge(entry.status);

  return (
    <li className="flex items-start justify-between gap-4 px-5 py-4">
      <div className="min-w-0 flex-1">
        <div className="flex items-center gap-2 flex-wrap">
          <p className="font-sans text-sm font-medium text-ink-900">
            {templateLabel(entry.templateType)}
          </p>
          <Badge variant="status" className="text-[10px]">
            {CHANNEL_LABELS[entry.channel] ?? entry.channel}
          </Badge>
        </div>
        {(entry.title || entry.body) && (
          <p className="mt-1 font-sans text-xs text-ink-500 truncate">
            {truncate(entry.title || entry.body, 80)}
          </p>
        )}
      </div>
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <Badge variant={badge.variant} className="text-[10px]">
          {badge.label}
        </Badge>
        {entry.sentAt && (
          <p className="font-sans text-xs text-ink-500">
            {new Date(entry.sentAt).toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              hour: "numeric",
              minute: "2-digit",
            })}
          </p>
        )}
      </div>
    </li>
  );
}

function RowSkeleton(): React.JSX.Element {
  return (
    <ul className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-cream-50">
      {[0, 1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="flex items-start justify-between gap-4 px-5 py-4">
          <div className="flex-1 space-y-2">
            <div className="flex items-center gap-2">
              <div className="h-4 w-28 rounded skeleton-shimmer bg-cream-100" />
              <div className="h-4 w-12 rounded-pill skeleton-shimmer bg-cream-100" />
            </div>
            <div className="h-3 w-48 max-w-full rounded skeleton-shimmer bg-cream-100" />
          </div>
          <div className="flex flex-col items-end gap-1.5">
            <div className="h-4 w-16 rounded-pill skeleton-shimmer bg-cream-100" />
            <div className="h-3 w-20 rounded skeleton-shimmer bg-cream-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
