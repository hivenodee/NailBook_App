"use client";

import * as React from "react";
import { Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

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
type DateRange = "ALL" | "TODAY" | "THIS_WEEK" | "LATER";

const STATUS_TABS: { label: string; value: StatusTab }[] = [
  { label: "Active", value: "ACTIVE" },
  { label: "Available", value: "AVAILABLE" },
  { label: "Notified", value: "NOTIFIED" },
  { label: "Expired", value: "EXPIRED" },
  { label: "All", value: "ALL" },
];

const DATE_RANGES: { label: string; value: DateRange }[] = [
  { label: "All dates", value: "ALL" },
  { label: "Today", value: "TODAY" },
  { label: "This week", value: "THIS_WEEK" },
  { label: "Later", value: "LATER" },
];

const TIME_PREF_LABELS: Record<string, string> = {
  ANY: "Any time",
  MORNING: "Morning",
  AFTERNOON: "Afternoon",
  EVENING: "Evening",
};

const DAY = 86_400_000;

// ─── Helpers ───────────────────────────────────────────────

function formatTargetDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    timeZone: "UTC",
  });
}

function formatSlotTime(iso: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  if (d < 7) return `${d}d ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
}

function statusBadge(status: WaitlistEntry["status"]): {
  variant: BadgeProps["variant"];
  label: string;
} {
  switch (status) {
    case "AVAILABLE":
      return { variant: "verified", label: "Slot open" };
    case "ACTIVE":
      return { variant: "neutral", label: "Waiting" };
    case "NOTIFIED":
      return { variant: "warning", label: "Notified" };
    case "BOOKED":
      return { variant: "verified", label: "Booked" };
    case "EXPIRED":
      return { variant: "status", label: "Expired" };
    case "CANCELLED":
      return { variant: "error", label: "Cancelled" };
    default:
      return { variant: "neutral", label: status };
  }
}

function inDateRange(targetDateIso: string, range: DateRange): boolean {
  if (range === "ALL") return true;
  const t = new Date(targetDateIso).getTime();
  const todayStart = new Date();
  todayStart.setHours(0, 0, 0, 0);
  const todayEnd = todayStart.getTime() + DAY;
  if (range === "TODAY") return t >= todayStart.getTime() && t < todayEnd;
  const weekEnd = todayStart.getTime() + 7 * DAY;
  if (range === "THIS_WEEK") return t >= todayStart.getTime() && t < weekEnd;
  if (range === "LATER") return t >= weekEnd;
  return true;
}

// ─── Page ──────────────────────────────────────────────────

export default function WaitlistPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = React.useState<StatusTab>("ACTIVE");
  const [dateRange, setDateRange] = React.useState<DateRange>("ALL");
  const [serviceFilter, setServiceFilter] = React.useState<string>("ALL");

  const [entries, setEntries] = React.useState<WaitlistEntry[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [page, setPage] = React.useState(1);
  const [totalPages, setTotalPages] = React.useState(1);
  const [total, setTotal] = React.useState(0);
  const [busyId, setBusyId] = React.useState<string | null>(null);

  const fetchEntries = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const statusParam = activeTab !== "ALL" ? `&status=${activeTab}` : "";
      const res = await fetch(`/api/waitlist/entries?page=${page}${statusParam}`);
      if (!res.ok) throw new Error("Server error");
      const json = await res.json();
      if (json.data) {
        setEntries(json.data.entries);
        setTotalPages(json.data.totalPages);
        setTotal(json.data.total);
      }
    } catch (e) {
      console.error("Failed to load waitlist:", e);
      setEntries([]);
      setLoadError("We couldn't load your waitlist. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [activeTab, page]);

  React.useEffect(() => {
    setPage(1);
    setServiceFilter("ALL");
    setDateRange("ALL");
  }, [activeTab]);

  React.useEffect(() => {
    fetchEntries();
  }, [fetchEntries]);

  async function handleRemove(id: string) {
    if (!confirm("Remove this waitlist entry?")) return;
    setBusyId(id);
    try {
      const res = await fetch(`/api/waitlist/entries/${id}`, {
        method: "DELETE",
      });
      if (res.ok) await fetchEntries();
    } catch {
      alert("Couldn't remove that entry. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  async function handleOfferSlot(id: string) {
    setBusyId(id);
    try {
      const res = await fetch(`/api/waitlist/entries/${id}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        await fetchEntries();
      } else {
        const json = await res.json();
        alert(json.error?.message || "Couldn't offer that slot.");
      }
    } catch {
      alert("Couldn't offer that slot. Try again.");
    } finally {
      setBusyId(null);
    }
  }

  // Available service names within the current entries
  const serviceNames = React.useMemo(() => {
    const set = new Set<string>();
    for (const e of entries) {
      if (e.service?.name) set.add(e.service.name);
    }
    return Array.from(set).sort();
  }, [entries]);

  // Apply client-side service + date filters
  const filtered = React.useMemo(() => {
    return entries.filter((e) => {
      const serviceMatch =
        serviceFilter === "ALL" || e.service?.name === serviceFilter;
      const dateMatch = inDateRange(e.targetDate, dateRange);
      return serviceMatch && dateMatch;
    });
  }, [entries, serviceFilter, dateRange]);

  const isFullEmpty =
    !loading &&
    total === 0 &&
    activeTab === "ACTIVE" &&
    serviceFilter === "ALL" &&
    dateRange === "ALL";

  // Subhead count: prefer total from server when possible
  const subhead = React.useMemo(() => {
    if (loading) return "Loading…";
    if (total === 0) return "No clients on the waitlist.";
    const word = total === 1 ? "client" : "clients";
    return `${total} ${word} waiting`;
  }, [loading, total]);

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="space-y-2">
        <Heading variant="display" className="text-3xl md:text-4xl">
          Waitlist
        </Heading>
        <p className="font-sans text-sm text-ink-500">{subhead}</p>
      </header>

      {/* ─── Status tabs (existing functionality, restyled) ─── */}
      <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
        {STATUS_TABS.map((tab) => (
          <FilterChip
            key={tab.value}
            active={activeTab === tab.value}
            onClick={() => setActiveTab(tab.value)}
          >
            {tab.label}
          </FilterChip>
        ))}
      </div>

      {/* ─── Service + date filters (new) ─── */}
      {!loading && entries.length > 0 && (
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          {serviceNames.length > 0 && (
            <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              <FilterChip
                active={serviceFilter === "ALL"}
                onClick={() => setServiceFilter("ALL")}
              >
                All services
              </FilterChip>
              {serviceNames.map((name) => (
                <FilterChip
                  key={name}
                  active={serviceFilter === name}
                  onClick={() => setServiceFilter(name)}
                >
                  {name}
                </FilterChip>
              ))}
            </div>
          )}

          <label className="inline-flex items-center gap-2 shrink-0">
            <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
              Date
            </span>
            <select
              value={dateRange}
              onChange={(e) => setDateRange(e.target.value as DateRange)}
              className="h-9 rounded-md border border-ink-200 bg-cream-50 pl-3 pr-8 font-sans text-sm text-ink-900 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
            >
              {DATE_RANGES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </label>
        </div>
      )}

      {/* ─── Body ─── */}
      {loadError ? (
        <ErrorBanner message={loadError} onRetry={fetchEntries} />
      ) : loading ? (
        <ListSkeleton />
      ) : isFullEmpty ? (
        <div className="rounded-md border border-dashed border-ink-200">
          <EmptyState
            icon={Users}
            title="No one on the waitlist"
            description="When you're fully booked, clients can join your waitlist to be notified of openings."
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="font-sans text-sm text-ink-500">
          No entries match the current filters.
        </p>
      ) : (
        <ul className="space-y-3">
          {filtered.map((entry) => (
            <EntryRow
              key={entry.id}
              entry={entry}
              busy={busyId === entry.id}
              onOfferSlot={() => handleOfferSlot(entry.id)}
              onRemove={() => handleRemove(entry.id)}
            />
          ))}
        </ul>
      )}

      {/* ─── Pagination ─── */}
      {totalPages > 1 && !loading && (
        <div className="flex items-center justify-between gap-2">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            Previous
          </Button>
          <span className="font-sans text-xs text-ink-500">
            Page {page} of {totalPages}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next
          </Button>
        </div>
      )}
    </div>
  );
}

// ─── Components ────────────────────────────────────────────

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
        "shrink-0 inline-flex items-center h-9 rounded-pill border px-4 font-sans text-sm whitespace-nowrap transition-all duration-200",
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

function EntryRow({
  entry,
  busy,
  onOfferSlot,
  onRemove,
}: {
  entry: WaitlistEntry;
  busy: boolean;
  onOfferSlot: () => void;
  onRemove: () => void;
}): React.JSX.Element {
  const badge = statusBadge(entry.status);
  const canOffer = entry.status === "AVAILABLE";
  const isTerminal = entry.status === "BOOKED" || entry.status === "CANCELLED";

  // Time line: prefer specific slot time when set, otherwise time-of-day preference.
  const timeLine = entry.targetTime
    ? formatSlotTime(entry.targetTime)
    : TIME_PREF_LABELS[entry.timePreference];

  return (
    <li>
      <Card
        padding="sm"
        className={cn(
          "flex flex-col gap-4 sm:flex-row sm:items-center sm:gap-5",
          isTerminal && "opacity-70",
        )}
      >
        <Avatar name={entry.clientName} size="md" className="shrink-0" />

        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <Heading variant="h4" as="h3" className="text-base truncate">
              {entry.clientName}
            </Heading>
            <Badge variant={badge.variant} className="text-[10px]">
              {badge.label}
            </Badge>
          </div>

          <p className="font-sans text-sm text-ink-700 truncate">
            {entry.service?.name ?? "Any service"}
            <span className="mx-1.5 text-ink-300">·</span>
            <span className="text-ink-700">{formatTargetDate(entry.targetDate)}</span>
            <span className="mx-1.5 text-ink-300">·</span>
            <span className="text-ink-500">{timeLine}</span>
          </p>

          <p className="font-sans text-xs text-ink-500">
            Added {timeAgo(entry.createdAt)}
            {entry.notifyCount > 0 && (
              <>
                <span className="mx-1.5 text-ink-300">·</span>
                Notified {entry.notifyCount}×
              </>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end">
          <Button
            type="button"
            variant="primary"
            size="sm"
            onClick={onOfferSlot}
            disabled={!canOffer || busy}
            title={
              canOffer
                ? "Offer this client the open slot"
                : "Available when a matching slot frees up"
            }
          >
            {busy && canOffer ? "Offering…" : "Offer slot"}
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={onRemove}
            disabled={busy}
          >
            Remove
          </Button>
        </div>
      </Card>
    </li>
  );
}

function ListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-3">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-4 h-24 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
