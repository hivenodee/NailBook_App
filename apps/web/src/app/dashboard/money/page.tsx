"use client";

import * as React from "react";
import { ExternalLink, FileText, Landmark } from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import SummaryStatCard from "@/components/ui/SummaryStatCard";
import RevenueChart from "@/components/ui/RevenueChart";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type Range = "7d" | "30d" | "90d" | "ytd" | "all";
type Granularity = "daily" | "weekly" | "monthly" | "yearly";
type ChartMode = "net" | "revenue" | "lost";

type AnalyticsSummary = {
  revenue: number;
  lostRevenue: number;
  recoveredRevenue: number;
  netRevenue: number;
  appointmentCount: number;
  confirmedCount: number;
  cancelledCount: number;
  noShowCount: number;
  waitlistRecoveryCount: number;
};

type Bucket = {
  date: string;
  label: string;
  revenue: number;
  lostRevenue: number;
  recoveredRevenue: number;
  netRevenue: number;
};

type AnalyticsData = {
  rangeStart: string;
  rangeEnd: string;
  summary: AnalyticsSummary;
  buckets: Bucket[];
};

const RANGES: { value: Range; label: string }[] = [
  { value: "7d", label: "7D" },
  { value: "30d", label: "30D" },
  { value: "90d", label: "90D" },
  { value: "ytd", label: "YTD" },
  { value: "all", label: "All" },
];

const RANGE_DEFAULT_GRANULARITY: Record<Range, Granularity> = {
  "7d": "daily",
  "30d": "daily",
  "90d": "weekly",
  ytd: "monthly",
  all: "monthly",
};

type Payment = {
  id: string;
  amountInCents: number;
  type: string;
  status: string;
  method: string;
  createdAt: string;
  appointment: {
    service: { name: string };
    client: { firstName: string | null; lastName: string | null };
  };
};

type StatusFilter = "ALL" | "COMPLETED" | "PENDING" | "REFUNDED";

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "COMPLETED", label: "Completed" },
  { value: "PENDING", label: "Pending" },
  { value: "REFUNDED", label: "Refunded" },
];

const PAGE_SIZE = 20;

// ─── Helpers ───────────────────────────────────────────────

function formatPrice(cents: number, opts?: { showSign?: boolean }): string {
  const dollars = (Math.abs(cents) / 100).toFixed(2);
  const sign = opts?.showSign ? (cents >= 0 ? "+" : "−") : "";
  return `${sign}$${dollars}`;
}

function formatBigPrice(cents: number): string {
  // No cents at the stat-card scale — keep the figure clean.
  if (cents === 0) return "$0";
  if (Math.abs(cents) >= 1_000_000) {
    return `$${(cents / 100_000).toFixed(0)}k`;
  }
  return `$${(cents / 100).toFixed(0)}`;
}

function getClientName(p: Payment): string {
  if (p.appointment.client.firstName) {
    return `${p.appointment.client.firstName}${
      p.appointment.client.lastName ? ` ${p.appointment.client.lastName}` : ""
    }`;
  }
  return "Client";
}

function isCredit(type: string): boolean {
  return type === "DEPOSIT" || type === "FULL" || type === "BALANCE" || type === "TIP";
}

function typeLabel(type: string): string {
  switch (type) {
    case "DEPOSIT":
      return "Deposit";
    case "FULL":
      return "Full payment";
    case "BALANCE":
      return "Balance";
    case "REFUND":
      return "Refund";
    case "TIP":
      return "Tip";
    default:
      return type;
  }
}

function paymentBadge(status: string): {
  variant: BadgeProps["variant"];
  label: string;
} | null {
  switch (status) {
    case "COMPLETED":
      return null; // Completed is the default; no badge clutter
    case "PENDING":
      return { variant: "warning", label: "Pending" };
    case "FAILED":
      return { variant: "error", label: "Failed" };
    case "REFUNDED":
      return { variant: "error", label: "Refunded" };
    default:
      return { variant: "neutral", label: status };
  }
}

// ─── Page ──────────────────────────────────────────────────

export default function MoneyPage(): React.JSX.Element {
  // Top stat-row analytics — fixed 30d + lifetime (don't change with the range toggle)
  const [recent, setRecent] = React.useState<AnalyticsData | null>(null);
  const [allTime, setAllTime] = React.useState<AnalyticsData | null>(null);
  const [statRowLoading, setStatRowLoading] = React.useState(true);

  // Performance section — user-controlled range
  const [range, setRange] = React.useState<Range>("30d");
  const [granularity, setGranularity] = React.useState<Granularity>("daily");
  const [chartMode, setChartMode] = React.useState<ChartMode>("net");
  const [rangeAnalytics, setRangeAnalytics] = React.useState<AnalyticsData | null>(
    null,
  );
  const [rangeLoading, setRangeLoading] = React.useState(true);

  const [payments, setPayments] = React.useState<Payment[]>([]);
  const [total, setTotal] = React.useState(0);
  const [offset, setOffset] = React.useState(0);
  const [statusFilter, setStatusFilter] = React.useState<StatusFilter>("ALL");
  const [txLoading, setTxLoading] = React.useState(true);

  // Fixed-range stat fetches (run once)
  React.useEffect(() => {
    setStatRowLoading(true);
    Promise.all([
      fetch(`/api/dashboard/analytics?range=30d&granularity=daily`).then((r) =>
        r.json(),
      ),
      fetch(`/api/dashboard/analytics?range=all&granularity=monthly`).then((r) =>
        r.json(),
      ),
    ])
      .then(([m30, all]) => {
        setRecent(m30.data || null);
        setAllTime(all.data || null);
      })
      .catch((e) => console.error("Analytics fetch failed:", e))
      .finally(() => setStatRowLoading(false));
  }, []);

  // User-controlled range fetch (re-runs on range/granularity change)
  React.useEffect(() => {
    setRangeLoading(true);
    fetch(`/api/dashboard/analytics?range=${range}&granularity=${granularity}`)
      .then((r) => r.json())
      .then((json) => setRangeAnalytics(json.data || null))
      .catch((e) => console.error("Range analytics fetch failed:", e))
      .finally(() => setRangeLoading(false));
  }, [range, granularity]);

  function handleRangeChange(newRange: Range) {
    setRange(newRange);
    setGranularity(RANGE_DEFAULT_GRANULARITY[newRange]);
  }

  const loadPayments = React.useCallback(async () => {
    setTxLoading(true);
    try {
      const statusParam =
        statusFilter !== "ALL" ? `&status=${statusFilter}` : "";
      const res = await fetch(
        `/api/payments?limit=${PAGE_SIZE}&offset=${offset}${statusParam}`,
      );
      const json = await res.json();
      setPayments(json.data?.payments || []);
      setTotal(json.data?.total || 0);
    } catch (e) {
      console.error("Failed to load payments:", e);
    } finally {
      setTxLoading(false);
    }
  }, [offset, statusFilter]);

  React.useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Stats — use what we actually have.
  const earnedRecent = recent?.summary.revenue ?? 0;
  const totalEarned = allTime?.summary.revenue ?? 0;
  // "Pending" = sum of currently-pending payments in the visible page.
  // Honest about scope; a real accumulator would need a dedicated API.
  const [pendingTotal, setPendingTotal] = React.useState(0);
  React.useEffect(() => {
    fetch(`/api/payments?status=PENDING&limit=200`)
      .then((r) => r.json())
      .then((json) => {
        const list = (json.data?.payments ?? []) as Payment[];
        setPendingTotal(list.reduce((s, p) => s + p.amountInCents, 0));
      })
      .catch(() => {});
  }, []);

  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;
  const isEmpty = !txLoading && payments.length === 0 && statusFilter === "ALL";

  return (
    <div className="space-y-12">
      {/* ─── Header ─── */}
      <header className="space-y-2">
        <Heading variant="display" className="text-3xl md:text-4xl">
          Money
        </Heading>
        <p className="font-sans text-sm text-ink-500">
          Track earnings, pending payments, and lifetime revenue.
        </p>
      </header>

      {/* ─── Stat row ─── */}
      <section className="space-y-5">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <StatCard
            value={formatBigPrice(earnedRecent)}
            label="Earned (last 30 days)"
            loading={statRowLoading}
          />
          <StatCard
            value={formatBigPrice(pendingTotal)}
            label="Processing"
            loading={statRowLoading}
          />
          <StatCard
            value={formatBigPrice(totalEarned)}
            label="Total earned"
            loading={statRowLoading}
          />
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button
            type="button"
            variant="primary"
            size="md"
            disabled
            className="gap-2"
          >
            Pay out now
          </Button>
          <p className="font-sans text-xs text-ink-500 max-w-md leading-relaxed">
            Direct payouts via Stripe Connect are coming soon. Each booking's
            payment goes to the card the client used; we'll route it to your
            account once Connect is wired up.
          </p>
        </div>
      </section>

      {/* ─── Performance ─── */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Heading variant="h3" className="text-xl">
              Performance
            </Heading>
            <span className="block h-px w-7 bg-rust-500" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {RANGES.map((r) => (
              <FilterChip
                key={r.value}
                active={range === r.value}
                onClick={() => handleRangeChange(r.value)}
              >
                {r.label}
              </FilterChip>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <SummaryStatCard
            label="Revenue"
            value={formatPrice(rangeAnalytics?.summary.revenue ?? 0)}
            subtitle={
              `${rangeAnalytics?.summary.appointmentCount ?? 0} booked` +
              (rangeAnalytics?.summary.confirmedCount
                ? ` (${rangeAnalytics.summary.confirmedCount} upcoming)`
                : "")
            }
            loading={rangeLoading}
            animationDelay={0}
          />
          <SummaryStatCard
            label="Net"
            value={formatPrice(rangeAnalytics?.summary.netRevenue ?? 0)}
            loading={rangeLoading}
            animationDelay={50}
          />
          <SummaryStatCard
            label="Lost"
            value={formatPrice(rangeAnalytics?.summary.lostRevenue ?? 0)}
            subtitle={`${rangeAnalytics?.summary.cancelledCount ?? 0} cancelled, ${rangeAnalytics?.summary.noShowCount ?? 0} no-shows`}
            loading={rangeLoading}
            animationDelay={100}
          />
          <SummaryStatCard
            label="Recovered"
            value={formatPrice(rangeAnalytics?.summary.recoveredRevenue ?? 0)}
            subtitle={`${rangeAnalytics?.summary.waitlistRecoveryCount ?? 0} from waitlist`}
            loading={rangeLoading}
            animationDelay={150}
          />
        </div>

        <RevenueChart
          buckets={rangeAnalytics?.buckets ?? []}
          loading={rangeLoading}
          mode={chartMode}
          onModeChange={setChartMode}
        />
      </section>

      {/* ─── Recent transactions ─── */}
      <section className="space-y-5">
        <div className="flex flex-wrap items-end justify-between gap-3">
          <div className="flex items-center gap-3">
            <Heading variant="h3" className="text-xl">
              Recent transactions
            </Heading>
            <span className="block h-px w-7 bg-rust-500" />
          </div>
          <div className="flex gap-2 overflow-x-auto scrollbar-hide -mx-1 px-1">
            {STATUS_FILTERS.map((s) => (
              <FilterChip
                key={s.value}
                active={statusFilter === s.value}
                onClick={() => {
                  setStatusFilter(s.value);
                  setOffset(0);
                }}
              >
                {s.label}
              </FilterChip>
            ))}
          </div>
        </div>

        {txLoading ? (
          <RowSkeleton />
        ) : isEmpty ? (
          <div className="rounded-md border border-dashed border-ink-200">
            <EmptyState
              variant="typographic"
              display="$0"
              title="No revenue yet"
              description="Your earnings will appear here after your first completed booking."
            />
          </div>
        ) : payments.length === 0 ? (
          <p className="font-sans text-sm text-ink-500">
            No matching transactions.
          </p>
        ) : (
          <ul className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-cream-50">
            {payments.map((p) => (
              <TransactionRow key={p.id} payment={p} />
            ))}
          </ul>
        )}

        {(hasPrev || hasMore) && (
          <div className="flex items-center justify-between gap-2">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasPrev}
              onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            >
              Previous
            </Button>
            <span className="font-sans text-xs text-ink-500">
              {offset + 1}–{Math.min(offset + PAGE_SIZE, total)} of {total}
            </span>
            <Button
              type="button"
              variant="ghost"
              size="sm"
              disabled={!hasMore}
              onClick={() => setOffset(offset + PAGE_SIZE)}
            >
              Next
            </Button>
          </div>
        )}
      </section>

      {/* ─── Payout settings ─── */}
      <SettingsSection
        icon={<Landmark size={18} strokeWidth={1.5} />}
        title="Payout settings"
        description="Connect a bank account to receive payouts from your bookings."
        ctaLabel="Get notified"
        ctaDisabled
        helperText="Coming soon — we'll launch payouts through Stripe Connect."
      />

      {/* ─── Tax documents ─── */}
      <SettingsSection
        icon={<FileText size={18} strokeWidth={1.5} />}
        title="Tax documents"
        description="Year-end 1099 forms will appear here once payouts are set up."
        ctaLabel="Download"
        ctaDisabled
        helperText="Available after your first calendar year of payouts."
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function StatCard({
  value,
  label,
  loading,
  accent = false,
}: {
  value: string;
  label: string;
  loading: boolean;
  accent?: boolean;
}): React.JSX.Element {
  if (loading) {
    return (
      <div className="rounded-md border border-ink-200 bg-cream-50 px-6 py-5 space-y-3">
        <div className="h-9 w-24 skeleton-shimmer bg-cream-100 rounded" />
        <div className="h-3 w-32 skeleton-shimmer bg-cream-100 rounded" />
      </div>
    );
  }
  return (
    <div className="rounded-md border border-ink-200 bg-cream-50 px-6 py-5">
      <p
        className={cn(
          "font-display leading-none tracking-tight",
          "text-4xl md:text-5xl",
          accent ? "text-rust-500" : "text-ink-900",
        )}
      >
        {value}
      </p>
      <p className="mt-3 font-sans text-xs uppercase tracking-wide text-ink-500">
        {label}
      </p>
    </div>
  );
}

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

function TransactionRow({ payment }: { payment: Payment }): React.JSX.Element {
  const credit = isCredit(payment.type);
  const name = getClientName(payment);
  const badge = paymentBadge(payment.status);

  return (
    <li className="flex items-center gap-4 px-5 py-4">
      {/* Date */}
      <div className="hidden sm:block w-24 shrink-0 font-sans text-sm text-ink-500">
        {new Date(payment.createdAt).toLocaleDateString("en-US", {
          month: "short",
          day: "numeric",
          year: "numeric",
          timeZone: "UTC",
        })}
      </div>

      {/* Description */}
      <div className="min-w-0 flex-1">
        <p className="font-sans text-base text-ink-900 truncate">
          {name}
          <span className="text-ink-500"> · {payment.appointment.service.name}</span>
        </p>
        <p className="mt-0.5 font-sans text-xs text-ink-500 sm:hidden">
          {new Date(payment.createdAt).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
            timeZone: "UTC",
          })}
          <span className="mx-1.5 text-ink-300">·</span>
          {typeLabel(payment.type)}
        </p>
        <p className="mt-0.5 font-sans text-xs text-ink-500 hidden sm:block">
          {typeLabel(payment.type)}
        </p>
      </div>

      {/* Status + Amount */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p
          className={cn(
            "font-display text-lg leading-none",
            credit ? "text-rust-500" : "text-ink-500",
          )}
        >
          {credit
            ? formatPrice(payment.amountInCents, { showSign: true })
            : formatPrice(-payment.amountInCents, { showSign: true })}
        </p>
        {badge && (
          <Badge variant={badge.variant} className="text-[10px]">
            {badge.label}
          </Badge>
        )}
      </div>
    </li>
  );
}

function SettingsSection({
  icon,
  title,
  description,
  ctaLabel,
  ctaDisabled,
  helperText,
  ctaHref,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  ctaDisabled?: boolean;
  helperText?: string;
  ctaHref?: string;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <div className="flex items-center gap-3">
        <Heading variant="h3" className="text-xl">
          {title}
        </Heading>
        <span className="block h-px w-7 bg-rust-500" />
      </div>
      <Card padding="md">
        <div className="flex flex-col sm:flex-row sm:items-center gap-4">
          <span
            aria-hidden="true"
            className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-rust-500"
          >
            {icon}
          </span>
          <div className="min-w-0 flex-1">
            <p className="font-sans text-base text-ink-900">{description}</p>
            {helperText && (
              <p className="mt-1 font-sans text-xs text-ink-500">
                {helperText}
              </p>
            )}
          </div>
          {ctaHref ? (
            <a
              href={ctaHref}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 shrink-0"
            >
              <Button type="button" variant="secondary" size="sm">
                {ctaLabel}
                <ExternalLink size={12} strokeWidth={1.75} className="ml-1" />
              </Button>
            </a>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              disabled={ctaDisabled}
              className="shrink-0"
            >
              {ctaLabel}
            </Button>
          )}
        </div>
      </Card>
    </section>
  );
}

function RowSkeleton(): React.JSX.Element {
  return (
    <ul className="divide-y divide-ink-200 rounded-md border border-ink-200 bg-cream-50">
      {[1, 2, 3, 4, 5].map((i) => (
        <li key={i} className="flex items-center gap-4 px-5 py-4">
          <div className="hidden sm:block w-24 h-4 rounded skeleton-shimmer bg-cream-100" />
          <div className="flex-1 space-y-2">
            <div className="h-4 w-48 rounded skeleton-shimmer bg-cream-100" />
            <div className="h-3 w-24 rounded skeleton-shimmer bg-cream-100" />
          </div>
          <div className="space-y-1.5">
            <div className="h-5 w-16 rounded skeleton-shimmer bg-cream-100" />
            <div className="h-4 w-14 rounded skeleton-shimmer bg-cream-100" />
          </div>
        </li>
      ))}
    </ul>
  );
}
