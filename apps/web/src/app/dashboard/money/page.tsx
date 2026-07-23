"use client";

import * as React from "react";
import Link from "next/link";
import {
  ArrowRight,
  Check,
  CreditCard,
  ExternalLink,
  FileText,
  Landmark,
  Loader2,
} from "lucide-react";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { SectionRule } from "@/components/ui/SectionRule";
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

type ConnectStatus = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  requirementsDue?: boolean;
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

function formatStatPrice(cents: number): string {
  // Whole dollars with commas at the stat scale. Never compact a money
  // figure: a provider reading "$12k" when they earned $12,450 is ambiguity.
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

const METHOD_LABELS: Record<string, string> = {
  CARD: "Card",
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  CASH_APP_PAY: "Cash App",
  CASH: "Cash",
};

function typeMethodLine(payment: Payment): string {
  const method = METHOD_LABELS[payment.method];
  return method ? `${typeLabel(payment.type)} · ${method}` : typeLabel(payment.type);
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

  // Stripe Connect payout status. The status endpoint reconciles with Stripe
  // and writes the capability flags back, so a page visit doubles as a sync.
  const [connect, setConnect] = React.useState<ConnectStatus | null>(null);
  const [connectLoading, setConnectLoading] = React.useState(true);
  const [connectOpening, setConnectOpening] = React.useState(false);

  React.useEffect(() => {
    fetch(`/api/providers/me/stripe/status`, { cache: "no-store" })
      .then((r) => r.json())
      .then((json) => setConnect(json.data ?? null))
      .catch(() => {})
      .finally(() => setConnectLoading(false));
  }, []);

  const openConnect = React.useCallback(async () => {
    setConnectOpening(true);
    try {
      const res = await fetch(`/api/providers/me/stripe/connect`, {
        method: "POST",
      });
      const json = await res.json();
      if (res.ok && json.data?.url) {
        window.location.href = json.data.url;
        return;
      }
    } catch {
      // fall through to re-enable the button
    }
    setConnectOpening(false);
  }, []);

  const payoutsActive = !!connect?.chargesEnabled && !!connect?.payoutsEnabled;

  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;
  const isEmpty = !txLoading && payments.length === 0 && statusFilter === "ALL";

  return (
    <div className="space-y-12">
      {/* ─── Header ─── */}
      <header className="space-y-3">
        <p className="text-label text-ink-500">Money &middot; Payments &amp; payouts</p>
        <Heading variant="display" className="text-3xl md:text-4xl">
          Your money, at a glance.
        </Heading>
        <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
          Deposits in, payouts out. Nothing ambiguous.
        </p>
      </header>

      {/* ─── Hero: the three numbers that matter ─── */}
      <section className="space-y-5">
        <div className="rounded-md border border-ink-200 bg-white">
          <div className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-ink-100">
            <HeroCell
              label="Booked · last 30 days"
              value={formatStatPrice(earnedRecent)}
              tone="money"
              loading={statRowLoading}
            />
            <HeroCell
              label="Processing"
              value={formatStatPrice(pendingTotal)}
              loading={statRowLoading}
            />
            <HeroCell
              label="Booked · all time"
              value={formatStatPrice(totalEarned)}
              loading={statRowLoading}
            />
          </div>
        </div>
        <p className="font-sans text-xs text-ink-500 leading-relaxed">
          Booked includes upcoming confirmed appointments. Processing counts
          payments that haven&rsquo;t completed yet.
        </p>

        <PayoutStatus
          loading={connectLoading}
          status={connect}
          opening={connectOpening}
          onConnect={openConnect}
        />
      </section>

      {/* ─── Performance ─── */}
      <section className="space-y-5">
        <SectionRule label="Performance" />

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

        <div
          className={cn(
            "grid grid-cols-2 lg:grid-cols-4 gap-3 transition-opacity duration-200",
            rangeLoading && rangeAnalytics && "opacity-60",
          )}
        >
          <SummaryStatCard
            label="Revenue"
            value={formatPrice(rangeAnalytics?.summary.revenue ?? 0)}
            subtitle={
              `${rangeAnalytics?.summary.appointmentCount ?? 0} booked` +
              (rangeAnalytics?.summary.confirmedCount
                ? ` (${rangeAnalytics.summary.confirmedCount} upcoming)`
                : "")
            }
            loading={rangeLoading && !rangeAnalytics}
            animationDelay={0}
          />
          <SummaryStatCard
            label="Net"
            value={formatPrice(rangeAnalytics?.summary.netRevenue ?? 0)}
            loading={rangeLoading && !rangeAnalytics}
            animationDelay={50}
          />
          <SummaryStatCard
            label="Lost"
            value={formatPrice(rangeAnalytics?.summary.lostRevenue ?? 0)}
            subtitle={`${rangeAnalytics?.summary.cancelledCount ?? 0} cancelled, ${rangeAnalytics?.summary.noShowCount ?? 0} no-shows`}
            loading={rangeLoading && !rangeAnalytics}
            animationDelay={100}
          />
          <SummaryStatCard
            label="Recovered"
            value={formatPrice(rangeAnalytics?.summary.recoveredRevenue ?? 0)}
            subtitle={`${rangeAnalytics?.summary.waitlistRecoveryCount ?? 0} from waitlist`}
            loading={rangeLoading && !rangeAnalytics}
            animationDelay={150}
          />
        </div>

        <RevenueChart
          buckets={rangeAnalytics?.buckets ?? []}
          loading={rangeLoading && !rangeAnalytics}
          refreshing={rangeLoading && !!rangeAnalytics}
          mode={chartMode}
          onModeChange={setChartMode}
        />
      </section>

      {/* ─── Recent transactions ─── */}
      <section className="space-y-5">
        <SectionRule label="Recent transactions" />

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
          <ul className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-white">
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
        description={
          payoutsActive
            ? "Your bank is connected. Manage payout details in Stripe."
            : "Connect a bank account through Stripe to receive payouts from your bookings."
        }
        ctaLabel={
          connectLoading
            ? "Payouts"
            : payoutsActive
              ? "Manage payouts"
              : connect?.connected
                ? "Finish setup"
                : "Set up payouts"
        }
        ctaTo="/dashboard/payouts"
        helperText={
          payoutsActive
            ? "Funds settle to your bank on Stripe's schedule."
            : connect?.connected
              ? "Stripe is still verifying your account."
              : "Deposits are collected on Stripe and paid out to your bank."
        }
      />

      {/* ─── Tax documents ─── */}
      <SettingsSection
        icon={<FileText size={18} strokeWidth={1.5} />}
        title="Tax documents"
        description="Stripe generates your year-end 1099 tax forms."
        ctaLabel="Open Stripe"
        ctaHref={payoutsActive ? "https://dashboard.stripe.com/tax/reports" : undefined}
        ctaDisabled={!payoutsActive}
        helperText={
          payoutsActive
            ? "View and download tax forms anytime in your Stripe dashboard."
            : "Available once payouts are active and you've completed a calendar year."
        }
      />
    </div>
  );
}

// ─── Sub-components ───────────────────────────────────────

function PayoutStatus({
  loading,
  status,
  opening,
  onConnect,
}: {
  loading: boolean;
  status: ConnectStatus | null;
  opening: boolean;
  onConnect: () => void;
}): React.JSX.Element {
  if (loading) {
    return (
      <div className="flex items-center gap-3">
        <div className="h-11 w-40 rounded-md skeleton-shimmer bg-cream-100" />
        <div className="h-4 w-56 rounded skeleton-shimmer bg-cream-100" />
      </div>
    );
  }

  const active = !!status?.chargesEnabled && !!status?.payoutsEnabled;

  // Fully verified — payouts run automatically on Stripe's schedule.
  if (active) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-success bg-success/10 px-3 py-1.5 font-sans text-xs font-medium text-success">
          <Check size={13} strokeWidth={2} />
          Payouts active
        </span>
        <p className="font-sans text-xs text-ink-500 max-w-md leading-relaxed">
          Card deposits are on. Funds settle to your bank on Stripe&rsquo;s
          schedule. No action needed.
        </p>
        <Link href="/dashboard/payouts" className="shrink-0">
          <Button type="button" variant="secondary" size="sm" className="gap-1.5">
            Manage payouts
            <ArrowRight size={13} strokeWidth={1.75} />
          </Button>
        </Link>
      </div>
    );
  }

  // Account created but Stripe is still verifying charges/payouts.
  if (status?.connected) {
    return (
      <div className="flex flex-wrap items-center gap-x-4 gap-y-3">
        <span className="inline-flex items-center gap-1.5 rounded-pill border border-warning bg-warning/10 px-3 py-1.5 font-sans text-xs font-medium text-warning">
          <Loader2 size={13} strokeWidth={2} />
          Verifying
        </span>
        <p className="font-sans text-xs text-ink-500 max-w-md leading-relaxed">
          Stripe is finishing verification. You can still take cash bookings in
          the meantime.
        </p>
        <Link href="/dashboard/payouts" className="shrink-0">
          <Button type="button" variant="primary" size="sm" className="gap-1.5">
            Finish setup
            <ArrowRight size={13} strokeWidth={1.75} />
          </Button>
        </Link>
      </div>
    );
  }

  // Not connected yet.
  return (
    <div className="flex flex-wrap items-center gap-3">
      <Button
        type="button"
        variant="primary"
        size="md"
        className="gap-2"
        onClick={onConnect}
        disabled={opening}
      >
        <CreditCard size={16} strokeWidth={1.5} />
        {opening ? "Opening Stripe…" : "Set up payouts"}
      </Button>
      <p className="font-sans text-xs text-ink-500 max-w-md leading-relaxed">
        Connect your bank through Stripe to accept card deposits and receive
        payouts. Prefer cash? You can still take cash bookings without this.
      </p>
    </div>
  );
}

function HeroCell({
  label,
  value,
  tone = "ink",
  loading,
}: {
  label: string;
  value: string;
  tone?: "money" | "ink";
  loading: boolean;
}): React.JSX.Element {
  return (
    <div className="px-6 py-5">
      <p className="font-sans uppercase text-xs tracking-widest font-medium text-ink-500">
        {label}
      </p>
      {loading ? (
        <div className="mt-3 h-10 w-28 skeleton-shimmer bg-cream-100 rounded" />
      ) : (
        <p
          className={cn(
            // Data wears sans (brand rule); proportional figures at display
            // size, so no tabular-nums here.
            "mt-2 font-sans text-4xl md:text-5xl font-semibold tracking-tight leading-none",
            tone === "money" ? "text-money" : "text-ink-900",
          )}
        >
          {value}
        </p>
      )}
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
          {typeMethodLine(payment)}
        </p>
        <p className="mt-0.5 font-sans text-xs text-ink-500 hidden sm:block">
          {typeMethodLine(payment)}
        </p>
      </div>

      {/* Status + Amount */}
      <div className="flex flex-col items-end gap-1.5 shrink-0">
        <p
          className={cn(
            // Ledger column: sans + tabular figures so amounts align down the list.
            "font-sans text-sm font-semibold leading-none tabular-nums",
            credit ? "text-money" : "text-ink-500",
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
  ctaTo,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
  ctaLabel: string;
  ctaDisabled?: boolean;
  helperText?: string;
  ctaHref?: string;
  ctaTo?: string;
}): React.JSX.Element {
  return (
    <section className="space-y-4">
      <SectionRule label={title} />
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
          {ctaTo ? (
            <Link href={ctaTo} className="shrink-0">
              <Button type="button" variant="secondary" size="sm">
                {ctaLabel}
                <ArrowRight size={12} strokeWidth={1.75} className="ml-1" />
              </Button>
            </Link>
          ) : ctaHref ? (
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
    <ul className="divide-y divide-ink-100 rounded-md border border-ink-200 bg-white">
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
