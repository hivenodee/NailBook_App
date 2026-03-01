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
    color: "#7B8B6A",
    gradientId: "gradNet",
  },
  revenue: {
    dataKey: "revenue",
    label: "Revenue",
    color: "#7B8B6A",
    gradientId: "gradRevenue",
  },
  lost: {
    dataKey: "lostRevenue",
    label: "Lost",
    color: "#BF6B6B",
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
    <div className="bg-surface rounded-card p-grid-1 shadow-card border border-border/50 text-xs">
      <p className="font-medium mb-0.5">{label}</p>
      <p className="text-text-secondary">
        ${(payload[0].value / 100).toFixed(2)}
      </p>
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
    return (
      <div className="bg-surface rounded-card p-grid-2 border border-border/50 skeleton-shimmer h-[340px]" />
    );
  }

  const hasData = buckets.some(
    (b) => b.revenue > 0 || b.lostRevenue > 0 || b.netRevenue > 0
  );

  if (!hasData) {
    return (
      <div className="bg-surface rounded-card p-grid-2 border border-border/50 flex items-center justify-center h-[340px]">
        <p className="text-text-muted text-sm">
          Complete your first appointment to see analytics
        </p>
      </div>
    );
  }

  return (
    <div className="bg-surface rounded-card p-grid-2 border border-border/50">
      {/* Mode toggle */}
      <div className="flex justify-end mb-grid-2">
        <div className="inline-flex bg-surface-alt rounded-button p-0.5">
          {MODES.map((m) => (
            <button
              key={m}
              onClick={() => onModeChange(m)}
              className={`px-3 py-1.5 text-xs font-medium rounded-[10px] transition-all ${
                mode === m
                  ? "bg-surface shadow-card text-text-primary"
                  : "text-text-muted hover:text-text-secondary"
              }`}
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {/* Chart */}
      <ResponsiveContainer width="100%" height={300}>
        <AreaChart
          data={buckets}
          margin={{ top: 5, right: 10, left: 0, bottom: 5 }}
        >
          <defs>
            <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor={config.color} stopOpacity={0.4} />
              <stop offset="95%" stopColor={config.color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#E5DFD6"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fill: "#9E958C" }}
            tickLine={false}
            axisLine={{ stroke: "#E5DFD6" }}
          />
          <YAxis
            tickFormatter={(v: number) => `$${(v / 100).toFixed(0)}`}
            tick={{ fontSize: 11, fill: "#9E958C" }}
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
