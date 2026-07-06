"use client";

import * as React from "react";
import { Send, User } from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { SectionRule } from "@/components/ui/SectionRule";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type FeedbackItem = {
  id: string;
  rating: number | null;
  body: string;
  isPublic: boolean;
  createdAt: string;
  appointment: {
    startTime: string;
    service: { name: string };
  };
  // Forward-compat fields. Not in schema yet — the renderer guards for undefined.
  response?: string | null;
  respondedAt?: string | null;
};

type RatingFilter = "ALL" | "5" | "4" | "LOW";
type VisibilityFilter = "all" | "public" | "private";

const RATING_FILTERS: { value: RatingFilter; label: string }[] = [
  { value: "ALL", label: "All ratings" },
  { value: "5", label: "5 stars" },
  { value: "4", label: "4 stars" },
  { value: "LOW", label: "3 and below" },
];

const VIS_OPTIONS: { value: VisibilityFilter; label: string }[] = [
  { value: "all", label: "All visibility" },
  { value: "public", label: "Public only" },
  { value: "private", label: "Private only" },
];

// ─── Helpers ───────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function matchesRating(rating: number | null, filter: RatingFilter): boolean {
  if (filter === "ALL") return true;
  if (rating === null) return false;
  if (filter === "5") return rating === 5;
  if (filter === "4") return rating === 4;
  return rating <= 3;
}

// ─── Page ──────────────────────────────────────────────────

export default function FeedbackPage(): React.JSX.Element {
  const [items, setItems] = React.useState<FeedbackItem[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [hasLoaded, setHasLoaded] = React.useState(false);
  const [ratingFilter, setRatingFilter] = React.useState<RatingFilter>("ALL");
  const [visibilityFilter, setVisibilityFilter] =
    React.useState<VisibilityFilter>("all");
  const [toggling, setToggling] = React.useState<string | null>(null);

  // Fetch — visibility filter goes server-side (existing API supports it).
  // Rating filter applies client-side.
  const load = React.useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (visibilityFilter === "public") params.set("public", "true");
    if (visibilityFilter === "private") params.set("public", "false");
    params.set("limit", "50");
    try {
      const res = await fetch(`/api/feedback?${params.toString()}`);
      const json = await res.json();
      if (json.data?.items) setItems(json.data.items);
    } catch (e) {
      console.error("Failed to load feedback:", e);
    } finally {
      setLoading(false);
      setHasLoaded(true);
    }
  }, [visibilityFilter]);

  React.useEffect(() => {
    load();
  }, [load]);

  async function togglePublic(id: string, isPublic: boolean) {
    setToggling(id);
    // Optimistic
    setItems((prev) =>
      prev.map((it) => (it.id === id ? { ...it, isPublic } : it)),
    );
    try {
      await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
    } catch {
      // Revert on error
      setItems((prev) =>
        prev.map((it) => (it.id === id ? { ...it, isPublic: !isPublic } : it)),
      );
    } finally {
      setToggling(null);
    }
  }

  // Rating aggregate (computed from loaded items).
  const ratedItems = items.filter((i) => i.rating !== null);
  const avgRating =
    ratedItems.length > 0
      ? ratedItems.reduce((s, i) => s + (i.rating ?? 0), 0) / ratedItems.length
      : null;
  const reviewCount = items.length;

  // Rating bucket counts for chip badges
  const bucketCounts = React.useMemo(() => {
    const counts = { ALL: items.length, "5": 0, "4": 0, LOW: 0 };
    for (const i of items) {
      if (i.rating === 5) counts["5"] += 1;
      else if (i.rating === 4) counts["4"] += 1;
      else if (i.rating !== null && i.rating <= 3) counts.LOW += 1;
    }
    return counts;
  }, [items]);

  const filtered = items.filter((i) => matchesRating(i.rating, ratingFilter));
  const isEmpty = items.length === 0 && visibilityFilter === "all";
  // Skeleton only before first data. Refetches dim the previous render instead.
  const showSkeleton = loading && !hasLoaded;
  const refreshing = loading && hasLoaded;

  return (
    <div className="space-y-12">
      {/* ─── Header ─── */}
      <header className="space-y-3">
        <p className="text-label text-ink-500">
          Feedback &middot; Client reviews
        </p>
        <Heading variant="display" className="text-3xl md:text-4xl">
          Feedback
        </Heading>
        <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
          Read what clients say and choose what shows on your profile.
        </p>
      </header>

      {showSkeleton ? (
        <ListSkeleton />
      ) : (
        <div
          className={cn(
            "space-y-12 transition-opacity duration-200",
            refreshing && "opacity-60 pointer-events-none",
          )}
        >
          {/* ─── Hero rating ─── */}
          {reviewCount > 0 && avgRating !== null && (
            <section className="rounded-md border border-ink-200 bg-cream-50 px-6 py-8 sm:px-10 sm:py-10">
              <div className="flex flex-col sm:flex-row sm:items-center gap-6 sm:gap-10">
                <div className="text-center sm:text-left">
                  <p className="font-sans text-6xl md:text-7xl font-semibold tracking-tight leading-none text-ink-900">
                    {avgRating.toFixed(1)}
                  </p>
                  <Stars
                    rating={avgRating}
                    size="lg"
                    className="mt-3 justify-center sm:justify-start"
                  />
                  <p className="mt-2 font-sans text-sm text-ink-500">
                    {reviewCount} {reviewCount === 1 ? "review" : "reviews"}
                  </p>
                </div>

                <div className="flex-1 space-y-3 max-w-md">
                  <p className="font-sans text-sm text-ink-700 leading-relaxed">
                    Ask recent clients to share how their visit went.
                  </p>
                  <div className="space-y-2">
                    <Button
                      type="button"
                      variant="secondary"
                      size="md"
                      disabled
                      className="gap-2"
                    >
                      <Send size={14} strokeWidth={1.75} />
                      Request reviews
                    </Button>
                    <p className="font-sans text-xs text-ink-500">
                      Coming soon. One-tap review requests will go out by
                      email.
                    </p>
                  </div>
                </div>
              </div>
            </section>
          )}

          {isEmpty ? (
            <div className="rounded-md border border-dashed border-ink-200">
              <EmptyState
                variant="typographic"
                display="00"
                title="No reviews yet"
                description="Reviews appear here after clients complete their bookings."
                action={{
                  label: "Request reviews from past clients",
                  onClick: () => {
                    alert(
                      "Review requests are coming soon. We'll let you know when this is live.",
                    );
                  },
                }}
              />
            </div>
          ) : (
            <section className="space-y-5">
              <SectionRule label="Reviews" />

              {/* Filters stay visible even when a filter returns nothing */}
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
                  {RATING_FILTERS.map((f) => {
                    const count = bucketCounts[f.value];
                    return (
                      <FilterChip
                        key={f.value}
                        active={ratingFilter === f.value}
                        onClick={() => setRatingFilter(f.value)}
                      >
                        {f.label}
                        {count > 0 && f.value !== "ALL" && (
                          <span
                            className={cn(
                              "ml-1.5 font-sans text-xs",
                              ratingFilter === f.value
                                ? "text-cream-50/80"
                                : "text-ink-300",
                            )}
                          >
                            {count}
                          </span>
                        )}
                      </FilterChip>
                    );
                  })}
                </div>

                <label className="inline-flex items-center gap-2 shrink-0">
                  <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
                    Show
                  </span>
                  <select
                    value={visibilityFilter}
                    onChange={(e) =>
                      setVisibilityFilter(e.target.value as VisibilityFilter)
                    }
                    className="h-9 rounded-md border border-ink-200 bg-cream-50 pl-3 pr-8 font-sans text-sm text-ink-900 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                  >
                    {VIS_OPTIONS.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </select>
                </label>
              </div>

              {filtered.length === 0 ? (
                <p className="font-sans text-sm text-ink-500">
                  No reviews match the current filters.
                </p>
              ) : (
                <ul className="space-y-4">
                  {filtered.map((item) => (
                    <ReviewCard
                      key={item.id}
                      item={item}
                      busyToggle={toggling === item.id}
                      onTogglePublic={() => togglePublic(item.id, !item.isPublic)}
                    />
                  ))}
                </ul>
              )}
            </section>
          )}
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

function Stars({
  rating,
  size = "sm",
  className,
}: {
  rating: number;
  size?: "sm" | "md" | "lg";
  className?: string;
}): React.JSX.Element {
  const filled = Math.round(rating);
  const sizeCls =
    size === "lg" ? "text-xl" : size === "md" ? "text-base" : "text-sm";
  return (
    <span
      aria-label={`${rating.toFixed(1)} out of 5 stars`}
      className={cn("flex items-center gap-0.5", sizeCls, className)}
    >
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          aria-hidden="true"
          className={s <= filled ? "text-rust-500" : "text-ink-200"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function ReviewCard({
  item,
  busyToggle,
  onTogglePublic,
}: {
  item: FeedbackItem;
  busyToggle: boolean;
  onTogglePublic: () => void;
}): React.JSX.Element {
  return (
    <li>
      <Card padding="md" className="space-y-4">
        {/* Header: avatar + name + visibility toggle */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <span
              aria-hidden="true"
              className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-ink-500"
            >
              <User size={16} strokeWidth={1.5} />
            </span>
            <div className="min-w-0">
              <p className="font-display text-base text-ink-900">
                Anonymous client
              </p>
              {item.rating !== null && (
                <Stars rating={item.rating} className="mt-0.5" />
              )}
            </div>
          </div>

          <button
            type="button"
            onClick={onTogglePublic}
            disabled={busyToggle}
            className={cn(
              "shrink-0 font-sans text-xs uppercase tracking-wide transition-colors",
              "focus-visible:outline-none focus-visible:text-rust-500",
              "disabled:opacity-50",
              item.isPublic
                ? "text-rust-500 hover:text-rust-600"
                : "text-ink-500 hover:text-ink-900",
            )}
          >
            {busyToggle ? "Saving…" : item.isPublic ? "Public" : "Hidden"}
          </button>
        </div>

        {/* Service tag */}
        <Badge variant="neutral">{item.appointment.service.name}</Badge>

        {/* Body */}
        <p className="font-sans text-base text-ink-700 leading-relaxed whitespace-pre-line">
          {item.body}
        </p>

        {/* Footer: date + Respond */}
        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <p className="font-sans text-sm text-ink-500">
            {formatDate(item.createdAt)}
          </p>
          {!item.response && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled
              title="Provider responses are coming soon"
            >
              Respond
            </Button>
          )}
        </div>

        {/* Provider response sub-card — renders when the schema lands */}
        {item.response && (
          <div className="mt-2 ml-4 sm:ml-6 rounded-md border border-ink-200 bg-cream-100 p-4 space-y-2">
            <div className="flex items-baseline gap-2">
              <Badge variant="status">Provider</Badge>
              {item.respondedAt && (
                <span className="font-sans text-xs text-ink-500">
                  {formatDate(item.respondedAt)}
                </span>
              )}
            </div>
            <p className="font-sans text-sm text-ink-700 leading-relaxed whitespace-pre-line">
              {item.response}
            </p>
          </div>
        )}
      </Card>
    </li>
  );
}

function ListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-6 h-40 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
