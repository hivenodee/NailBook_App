"use client";

import React from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { tokens } from "@/lib/design-tokens";

type Bucket = {
  date: string;
  label: string;
  revenue: number;
  lostRevenue: number;
  recoveredRevenue: number;
  netRevenue: number;
};

type ChartMode = "net" | "revenue" | "lost";

type RevenueChartProps = {
  buckets: Bucket[];
  loading?: boolean;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
};

const MODE_CONFIG: Record<
  ChartMode,
  { dataKey: string; label: string; color: string; gradientId: string }
> = {
  net: {
    dataKey: "netRevenue",
    label: "Net",
    color: tokens.colors.rust[500],
    gradientId: "gradNet",
  },
  revenue: {
    dataKey: "revenue",
    label: "Revenue",
    color: tokens.colors.rust[500],
    gradientId: "gradRevenue",
  },
  lost: {
    dataKey: "lostRevenue",
    label: "Lost",
    color: tokens.colors.rust[600],
    gradientId: "gradLost",
  },
};

const MODES: ChartMode[] = ["net", "revenue", "lost"];

function CustomTooltip({
  active,
  payload,
  label,
}: {
  active?: boolean;
  payload?: Array<{ value: number; dataKey: string }>;
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-md bg-cream-50 border border-ink-200 px-3 py-2 text-xs font-sans shadow-soft">
      <p className="font-medium text-ink-900 mb-0.5">{label}</p>
      <p className="text-ink-500">${(payload[0].value / 100).toFixed(2)}</p>
    </div>
  );
}

export default function RevenueChart({
  buckets,
  loading,
  mode,
  onModeChange,
}: RevenueChartProps): React.JSX.Element {
  const config = MODE_CONFIG[mode];

  if (loading) {
    return <div className="rounded-md skeleton-shimmer h-[340px] bg-cream-50 border border-ink-200" />;
  }

  const hasData = buckets.some(
    (b) => b.revenue > 0 || b.lostRevenue > 0 || b.netRevenue > 0,
  );

  if (!hasData) {
    return (
      <div className="rounded-md flex items-center justify-center h-[340px] bg-cream-50 border border-ink-200">
        <p className="text-sm font-sans text-ink-500">
          Complete your first appointment to see analytics.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-md p-4 bg-cream-50 border border-ink-200">
      {/* Mode toggle */}
      <div className="flex justify-end mb-4">
        <div className="inline-flex rounded-pill p-0.5 bg-cream-100 border border-ink-200">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={
                "px-3 py-1.5 text-xs font-sans font-medium rounded-pill transition-colors " +
                (mode === m
                  ? "bg-cream-50 text-ink-900 shadow-sm"
                  : "text-ink-500 hover:text-ink-900")
              }
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart data={buckets} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke={tokens.colors.ink[200]}
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: tokens.colors.ink[500] }}
            tickLine={false}
            axisLine={{ stroke: tokens.colors.ink[200] }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
            tick={{ fontSize: 11, fill: tokens.colors.ink[500] }}
            tickLine={false}
            axisLine={false}
            width={50}
          />
          <Tooltip content={<CustomTooltip />} />
          <Area
            type="monotone"
            dataKey={config.dataKey}
            stroke={config.color}
            strokeWidth={2}
            fill={`url(#${config.gradientId})`}
            dot={false}
            activeDot={{ r: 4, fill: config.color }}
          />
        </AreaChart>
      </ResponsiveContainer>
    </div>
  );
}
