"use client";

import React, { useEffect, useState, useCallback } from "react";
import { paymentStatusColor } from "@/lib/status-colors";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";

// ─── Types ──────────────────────────────────────────

type Range = "7d" | "30d" | "90d" | "ytd" | "all";
type Granularity = "daily" | "weekly" | "monthly" | "yearly";

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

const GRANULARITIES: { value: Granularity; label: string }[] = [
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
  { value: "yearly", label: "Yearly" },
];

const RANGE_DEFAULT_GRANULARITY: Record<Range, Granularity> = {
  "7d": "daily",
  "30d": "daily",
  "90d": "weekly",
  ytd: "monthly",
  all: "monthly",
};

const STATUS_FILTERS = ["All", "COMPLETED", "PENDING", "FAILED", "REFUNDED"] as const;

const CHART_COLORS = {
  revenue: "#7C8C6E",
  lost: "#C27070",
  recovered: "#B8A9C9",
  net: "#2D2D2D",
};

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
    default:
      return type;
  }
}

// ─── Chart Tooltip ──────────────────────────────────

function ChartTooltip({ active, payload, label }: { active?: boolean; payload?: Array<{ color: string; name: string; value: number }>; label?: string }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-surface rounded-card p-2 shadow-card border border-border text-xs">
      <p className="font-medium mb-1">{label}</p>
      {payload.map((entry) => (
        <p key={entry.name} style={{ color: entry.color }}>
          {entry.name}: {formatDollars(entry.value)}
        </p>
      ))}
    </div>
  );
}

// ─── Page Component ─────────────────────────────────

export default function MoneyPage(): React.JSX.Element {
  // Analytics state
  const [range, setRange] = useState<Range>("30d");
  const [granularity, setGranularity] = useState<Granularity>("daily");
  const [analytics, setAnalytics] = useState<AnalyticsData | null>(null);
  const [analyticsLoading, setAnalyticsLoading] = useState(true);

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
  const hasChartData = analytics?.buckets?.some(
    (b) => b.revenue > 0 || b.lostRevenue > 0 || b.recoveredRevenue > 0
  );

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Money</h1>

      {/* ─── Range + Granularity Controls ─── */}
      <div className="flex flex-wrap gap-2">
        <div className="flex gap-1">
          {RANGES.map((r) => (
            <button
              key={r.value}
              onClick={() => handleRangeChange(r.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                range === r.value
                  ? "bg-primary text-white"
                  : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
              }`}
            >
              {r.label}
            </button>
          ))}
        </div>
        <div className="flex gap-1">
          {GRANULARITIES.map((g) => (
            <button
              key={g.value}
              onClick={() => setGranularity(g.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-full transition-colors ${
                granularity === g.value
                  ? "bg-primary/20 text-primary"
                  : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
              }`}
            >
              {g.label}
            </button>
          ))}
        </div>
      </div>

      {/* ─── KPI Cards ─── */}
      {analyticsLoading ? (
        <div className="grid grid-cols-2 gap-grid-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse h-20" />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 gap-grid-2">
          <div className="bg-surface rounded-card p-grid-2 shadow-card">
            <p className="text-text-muted text-xs">Revenue</p>
            <p className="font-display text-xl" style={{ color: CHART_COLORS.revenue }}>
              {formatDollars(summary?.revenue ?? 0)}
            </p>
            <p className="text-text-muted text-xs">
              {summary?.appointmentCount ?? 0} booked{summary?.confirmedCount ? ` (${summary.confirmedCount} upcoming)` : ""}
            </p>
          </div>
          <div className="bg-surface rounded-card p-grid-2 shadow-card">
            <p className="text-text-muted text-xs">Lost</p>
            <p className="font-display text-xl" style={{ color: CHART_COLORS.lost }}>
              {formatDollars(summary?.lostRevenue ?? 0)}
            </p>
            <p className="text-text-muted text-xs">
              {summary?.cancelledCount ?? 0} cancelled, {summary?.noShowCount ?? 0} no-shows
            </p>
          </div>
          <div className="bg-surface rounded-card p-grid-2 shadow-card">
            <p className="text-text-muted text-xs">Recovered</p>
            <p className="font-display text-xl" style={{ color: CHART_COLORS.recovered }}>
              {formatDollars(summary?.recoveredRevenue ?? 0)}
            </p>
            <p className="text-text-muted text-xs">{summary?.waitlistRecoveryCount ?? 0} from waitlist</p>
          </div>
          <div className="bg-surface rounded-card p-grid-2 shadow-card">
            <p className="text-text-muted text-xs">Net</p>
            <p className="font-display text-xl" style={{ color: CHART_COLORS.net }}>
              {formatDollars(summary?.netRevenue ?? 0)}
            </p>
          </div>
        </div>
      )}

      {/* ─── Revenue Chart ─── */}
      {analyticsLoading ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse h-[280px]" />
      ) : !hasChartData ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card flex items-center justify-center h-[280px]">
          <p className="text-text-muted text-sm">Complete your first appointment to see analytics</p>
        </div>
      ) : (
        <div className="bg-surface rounded-card p-grid-2 shadow-card">
          <ResponsiveContainer width="100%" height={280}>
            <LineChart data={analytics?.buckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#E5E5E5" />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: "#8A8A8A" }}
                tickLine={false}
                axisLine={{ stroke: "#E5E5E5" }}
              />
              <YAxis
                tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
                tick={{ fontSize: 11, fill: "#8A8A8A" }}
                tickLine={false}
                axisLine={false}
                width={50}
              />
              <Tooltip content={<ChartTooltip />} />
              <Legend
                wrapperStyle={{ fontSize: 12, paddingTop: 8 }}
                iconType="plainline"
              />
              <Line
                type="monotone"
                dataKey="revenue"
                name="Revenue"
                stroke={CHART_COLORS.revenue}
                strokeWidth={2}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="lostRevenue"
                name="Lost"
                stroke={CHART_COLORS.lost}
                strokeWidth={1.5}
                strokeDasharray="5 3"
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="recoveredRevenue"
                name="Recovered"
                stroke={CHART_COLORS.recovered}
                strokeWidth={1.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
              <Line
                type="monotone"
                dataKey="netRevenue"
                name="Net"
                stroke={CHART_COLORS.net}
                strokeWidth={2.5}
                dot={false}
                activeDot={{ r: 4 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}

      {/* ─── Transaction Filter ─── */}
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

      {/* ─── Transaction List ─── */}
      {txLoading ? (
        <div className="space-y-grid-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse">
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
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">No payments yet</p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {payments.map((payment) => {
            const clientName =
              payment.appointment.client.firstName
                ? `${payment.appointment.client.firstName} ${payment.appointment.client.lastName || ""}`.trim()
                : "Client";

            return (
              <div
                key={payment.id}
                className="bg-surface rounded-card p-grid-2 shadow-card"
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
