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
  LabelList,
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
type ChartView = "chart" | "table";

type RevenueChartProps = {
  buckets: Bucket[];
  /** First load — no data yet, show the skeleton. */
  loading?: boolean;
  /** Refetch with data on screen — hold the previous render, dimmed. */
  refreshing?: boolean;
  mode: ChartMode;
  onModeChange: (mode: ChartMode) => void;
};

const MODE_CONFIG: Record<
  ChartMode,
  {
    dataKey: "netRevenue" | "revenue" | "lostRevenue";
    label: string;
    color: string;
    gradientId: string;
  }
> = {
  net: {
    dataKey: "netRevenue",
    label: "Net",
    color: tokens.colors.money.DEFAULT,
    gradientId: "gradNet",
  },
  revenue: {
    dataKey: "revenue",
    label: "Revenue",
    color: tokens.colors.money.DEFAULT,
    gradientId: "gradRevenue",
  },
  lost: {
    dataKey: "lostRevenue",
    label: "Lost",
    color: tokens.colors.error,
    gradientId: "gradLost",
  },
};

const MODES: ChartMode[] = ["net", "revenue", "lost"];

function formatDollars(cents: number): string {
  return `$${Math.round(cents / 100).toLocaleString()}`;
}

function formatExact(cents: number): string {
  return `$${(cents / 100).toLocaleString(undefined, {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

// Value leads, label follows: the reader hovering already knows the series;
// they want the number.
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
    <div className="rounded-md bg-white border border-ink-200 px-3 py-2 font-sans shadow-soft">
      <p className="text-sm font-semibold text-ink-900">
        {formatExact(payload[0].value)}
      </p>
      <p className="mt-0.5 text-xs text-ink-500">{label}</p>
    </div>
  );
}

// One renderer for every point: invisible everywhere except the last, which
// gets a surface-ringed end dot plus the end-of-line value label (in ink,
// never the series color — text doesn't wear the data color).
function makeEndDot(lastIndex: number, color: string) {
  return function EndDot(props: {
    cx?: number;
    cy?: number;
    index?: number;
  }): React.JSX.Element {
    const { cx = 0, cy = 0, index } = props;
    if (index !== lastIndex) {
      return <circle key={`dot-${index}`} cx={cx} cy={cy} r={0} fill="none" />;
    }
    return (
      <g key={`dot-${index}`}>
        <circle cx={cx} cy={cy} r={4} fill={color} stroke="#FFFFFF" strokeWidth={2} />
      </g>
    );
  };
}

export default function RevenueChart({
  buckets,
  loading,
  refreshing,
  mode,
  onModeChange,
}: RevenueChartProps): React.JSX.Element {
  const config = MODE_CONFIG[mode];
  const [view, setView] = React.useState<ChartView>("chart");

  if (loading) {
    return <div className="rounded-md skeleton-shimmer h-[340px] bg-cream-50 border border-ink-200" />;
  }

  const hasData = buckets.some(
    (b) => b.revenue > 0 || b.lostRevenue > 0 || b.netRevenue > 0,
  );

  if (!hasData) {
    return (
      <div className="rounded-md flex items-center justify-center h-[340px] bg-white border border-ink-200">
        <p className="text-sm font-sans text-ink-500">
          Complete your first appointment to see your money move.
        </p>
      </div>
    );
  }

  const lastIndex = buckets.length - 1;
  const lastValue = buckets[lastIndex]?.[config.dataKey] ?? 0;

  return (
    <div
      className={
        "rounded-md p-5 bg-white border border-ink-200 transition-opacity duration-200" +
        (refreshing ? " opacity-60 pointer-events-none" : "")
      }
    >
      {/* Controls: view + measure, one row above the plot */}
      <div className="flex items-center justify-between gap-3 mb-4">
        <div
          className="inline-flex rounded-pill p-0.5 bg-cream-100 border border-ink-200"
          role="group"
          aria-label="Chart view"
        >
          {(["chart", "table"] as ChartView[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={
                "px-3 py-1.5 text-xs font-sans font-medium rounded-pill transition-colors " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 " +
                (view === v
                  ? "bg-white text-ink-900 border border-ink-200"
                  : "text-ink-500 hover:text-ink-900")
              }
            >
              {v === "chart" ? "Chart" : "Table"}
            </button>
          ))}
        </div>

        <div
          className="inline-flex rounded-pill p-0.5 bg-cream-100 border border-ink-200"
          role="group"
          aria-label="Measure"
        >
          {MODES.map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => onModeChange(m)}
              aria-pressed={mode === m}
              className={
                "px-3 py-1.5 text-xs font-sans font-medium rounded-pill transition-colors " +
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 " +
                (mode === m
                  ? "bg-white text-ink-900 border border-ink-200"
                  : "text-ink-500 hover:text-ink-900")
              }
            >
              {MODE_CONFIG[m].label}
            </button>
          ))}
        </div>
      </div>

      {view === "table" ? (
        <div className="max-h-[300px] overflow-y-auto overflow-x-auto">
          <table className="w-full text-left font-sans">
            <caption className="sr-only">
              {config.label} by period for the selected range
            </caption>
            <thead>
              <tr className="border-b border-ink-200">
                <th scope="col" className="py-2 pr-4 text-xs font-medium uppercase tracking-widest text-ink-500">
                  Period
                </th>
                <th scope="col" className="py-2 text-right text-xs font-medium uppercase tracking-widest text-ink-500">
                  {config.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {buckets.map((b) => (
                <tr key={b.date} className="border-b border-ink-100 last:border-b-0">
                  <td className="py-2 pr-4 text-xs text-ink-700">{b.label}</td>
                  <td className="py-2 text-right text-xs font-medium text-ink-900 tabular-nums">
                    {formatExact(b[config.dataKey])}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <ResponsiveContainer width="100%" height={300}>
          <AreaChart
            data={buckets}
            margin={{ top: 24, right: 8, left: 0, bottom: 5 }}
          >
            <defs>
              <linearGradient id={config.gradientId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={config.color} stopOpacity={0.12} />
                <stop offset="100%" stopColor={config.color} stopOpacity={0.02} />
              </linearGradient>
            </defs>
            <CartesianGrid
              stroke={tokens.colors.ink[100]}
              strokeWidth={1}
              vertical={false}
            />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: tokens.colors.ink[500] }}
              tickLine={false}
              axisLine={{ stroke: tokens.colors.ink[200] }}
            />
            <YAxis
              tickFormatter={(v: number) => formatDollars(v)}
              tick={{ fontSize: 11, fill: tokens.colors.ink[500] }}
              tickLine={false}
              axisLine={false}
              width={56}
            />
            <Tooltip
              content={<CustomTooltip />}
              cursor={{ stroke: tokens.colors.ink[200], strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey={config.dataKey}
              stroke={config.color}
              strokeWidth={2}
              fill={`url(#${config.gradientId})`}
              dot={makeEndDot(lastIndex, config.color)}
              activeDot={{ r: 4, fill: config.color, stroke: "#FFFFFF", strokeWidth: 2 }}
              animationDuration={300}
            >
              {/* End-of-line value label: the one number the line leads to. */}
              <LabelList
                dataKey={config.dataKey}
                content={(props: { x?: number | string; y?: number | string; index?: number }) => {
                  if (props.index !== lastIndex) return null;
                  const x = Number(props.x ?? 0);
                  const y = Number(props.y ?? 0);
                  return (
                    <text
                      x={x - 8}
                      y={y - 12}
                      textAnchor="end"
                      fontSize={12}
                      fontWeight={600}
                      fill={tokens.colors.ink[700]}
                      style={{ fontFamily: "var(--font-sans), sans-serif" }}
                    >
                      {formatDollars(lastValue)}
                    </text>
                  );
                }}
              />
            </Area>
          </AreaChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
