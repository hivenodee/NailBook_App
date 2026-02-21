"use client";

import React, { useEffect, useState, useCallback } from "react";
import { paymentStatusColor } from "@/lib/status-colors";
import SummaryStatCard from "@/components/ui/SummaryStatCard";
import RevenueChart from "@/components/ui/RevenueChart";

// ─── Types ──────────────────────────────────────────

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

// ─── Constants ──────────────────────────────────────

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

const STATUS_FILTERS = ["All", "COMPLETED", "PENDING", "FAILED", "REFUNDED"] as const;

const PAGE_SIZE = 20;

// ─── Helpers ────────────────────────────────────────

function formatDollars(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function typeLabel(type: string) {
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

// ─── Page Component ─────────────────────────────────

export default function MoneyPage(): React.JSX.Element {
  // Analytics state
  const [range, setRange] = useState<Range>("30d");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);
  const [chartMode, setChartMode] = useState<ChartMode>("net");

  // Transaction state
  const [payments, setPayments] = useState<Payment[]>([]);
  const [total, setTotal] = useState(0);
  const [offset, setOffset] = useState(0);
  const [statusFilter, setStatusFilter] = useState<string>("All");
  const [txLoading, setTxLoading] = useState(true);

  // Fetch analytics
  const loadAnalytics = useCallback(async () => {
    setAnalyticsLoading(true);
    try {
      const res = await fetch(
        `/api/dashboard/analytics?range=${range}&granularity=${granularity}`
      );
      const json = await res.json();
      setAnalytics(json.data || null);
    } catch (e) {
      console.error("Failed to load analytics:", e);
    } finally {
      setAnalyticsLoading(false);
    }
  }, [range, granularity]);

  // Fetch transactions
  const loadPayments = useCallback(async () => {
    setTxLoading(true);
    try {
      const statusParam = statusFilter !== "All" ? `&status=${statusFilter}` : "";
      const res = await fetch(
        `/api/payments?limit=${PAGE_SIZE}&offset=${offset}${statusParam}`
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

  useEffect(() => {
    loadAnalytics();
  }, [loadAnalytics]);

  useEffect(() => {
    loadPayments();
  }, [loadPayments]);

  // Smart granularity auto-select on range change
  function handleRangeChange(newRange: Range) {
    setRange(newRange);
    setGranularity(RANGE_DEFAULT_GRANULARITY[newRange]);
  }

  function handleStatusFilter(status: string) {
    setStatusFilter(status);
    setOffset(0);
  }

  const summary = analytics?.summary;
  const hasMore = offset + PAGE_SIZE < total;
  const hasPrev = offset > 0;

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Money</h1>

      {/* ─── Range Toggle ─── */}
      <div className="inline-flex bg-surface-alt rounded-button p-0.5">
        {RANGES.map((r) => (
          <button
            key={r.value}
            onClick={() => handleRangeChange(r.value)}
            className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-all ${
              range === r.value
                ? "bg-surface shadow-card text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {r.label}
          </button>
        ))}
      </div>

      {/* ─── KPI Cards ─── */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-grid-2">
        <SummaryStatCard
          label="Revenue"
          value={formatDollars(summary?.revenue ?? 0)}
          subtitle={`${summary?.appointmentCount ?? 0} booked${summary?.confirmedCount ? ` (${summary.confirmedCount} upcoming)` : ""}`}
          accentColor="#7B8B6A"
          loading={analyticsLoading}
          animationDelay={0}
        />
        <SummaryStatCard
          label="Net"
          value={formatDollars(summary?.netRevenue ?? 0)}
          loading={analyticsLoading}
          animationDelay={50}
        />
        <SummaryStatCard
          label="Lost"
          value={formatDollars(summary?.lostRevenue ?? 0)}
          subtitle={`${summary?.cancelledCount ?? 0} cancelled, ${summary?.noShowCount ?? 0} no-shows`}
          accentColor="#BF6B6B"
          loading={analyticsLoading}
          animationDelay={100}
        />
        <SummaryStatCard
          label="Recovered"
          value={formatDollars(summary?.recoveredRevenue ?? 0)}
          subtitle={`${summary?.waitlistRecoveryCount ?? 0} from waitlist`}
          accentColor="#7A94AA"
          loading={analyticsLoading}
          animationDelay={150}
        />
      </div>

      {/* ─── Revenue Chart ─── */}
      <RevenueChart
        buckets={analytics?.buckets ?? []}
        loading={analyticsLoading}
        mode={chartMode}
        onModeChange={setChartMode}
      />

      {/* ─── Status Filter Pills ─── */}
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
            {s === "All" ? "All" : s.charAt(0) + s.slice(1).toLowerCase()}
          </button>
        ))}
      </div>

      {/* ─── Transactions ─── */}
      {txLoading ? (
        <div className="space-y-grid-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 border border-border/50 skeleton-shimmer">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-border/60 rounded w-28" />
                  <div className="h-3 bg-border/40 rounded w-20" />
                </div>
                <div className="space-y-2 text-right">
                  <div className="h-4 bg-border/60 rounded w-16 ml-auto" />
                  <div className="h-5 bg-border/40 rounded-full w-20 ml-auto" />
                </div>
              </div>
            </div>
          ))}
        </div>
      ) : payments.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 border border-border/50 text-center">
          <p className="text-text-muted">No payments yet</p>
        </div>
      ) : (
        <>
          {/* Desktop table */}
          <div className="hidden lg:block bg-surface rounded-card border border-border/50 overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-surface-alt/50">
                  <th className="text-left px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Date</th>
                  <th className="text-left px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Client</th>
                  <th className="text-left px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Service</th>
                  <th className="text-right px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Amount</th>
                  <th className="text-left px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Type</th>
                  <th className="text-left px-grid-2 py-2.5 text-xs font-medium text-text-muted uppercase tracking-wider">Status</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((payment) => {
                  const clientName =
                    payment.appointment.client.firstName
                      ? `${payment.appointment.client.firstName} ${payment.appointment.client.lastName || ""}`.trim()
                      : "Client";

                  return (
                    <tr key={payment.id} className="border-b border-border/30 last:border-b-0 hover:bg-surface-alt/30 transition-colors">
                      <td className="px-grid-2 py-3 text-text-muted text-xs">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </td>
                      <td className="px-grid-2 py-3 font-medium">{clientName}</td>
                      <td className="px-grid-2 py-3 text-text-secondary">{payment.appointment.service.name}</td>
                      <td className="px-grid-2 py-3 text-right font-display">${(payment.amountInCents / 100).toFixed(2)}</td>
                      <td className="px-grid-2 py-3 text-text-muted text-xs">{typeLabel(payment.type)}</td>
                      <td className="px-grid-2 py-3">
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentStatusColor(payment.status)}`}>
                          {payment.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Mobile cards */}
          <div className="lg:hidden space-y-grid-1">
            {payments.map((payment, index) => {
              const clientName =
                payment.appointment.client.firstName
                  ? `${payment.appointment.client.firstName} ${payment.appointment.client.lastName || ""}`.trim()
                  : "Client";

              return (
                <div
                  key={payment.id}
                  className="bg-surface rounded-card p-grid-2 border border-border/50 animate-fade-in-up"
                  style={{ animationDelay: `${index * 30}ms`, animationFillMode: "both" }}
                >
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{clientName}</p>
                      <p className="text-text-muted text-xs">
                        {payment.appointment.service.name}
                      </p>
                      <p className="text-text-muted text-xs mt-0.5">
                        {new Date(payment.createdAt).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                          timeZone: "UTC",
                        })}
                      </p>
                    </div>
                    <div className="text-right space-y-1">
                      <p className="font-display text-base">
                        ${(payment.amountInCents / 100).toFixed(2)}
                      </p>
                      <p className="text-xs text-text-muted">
                        {typeLabel(payment.type)}
                      </p>
                      <span
                        className={`text-xs font-medium px-2 py-0.5 rounded-full ${paymentStatusColor(payment.status)}`}
                      >
                        {payment.status}
                      </span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}

      {/* ─── Pagination ─── */}
      {(hasPrev || hasMore) && (
        <div className="flex justify-between">
          <button
            onClick={() => setOffset(Math.max(0, offset - PAGE_SIZE))}
            disabled={!hasPrev}
            className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <button
            onClick={() => setOffset(offset + PAGE_SIZE)}
            disabled={!hasMore}
            className="text-sm font-medium px-4 py-2 rounded-button bg-background text-text-secondary border border-border hover:bg-border/40 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
