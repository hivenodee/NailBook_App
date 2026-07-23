"use client";

import React from "react";

type SummaryStatCardProps = {
  label: string;
  value: string;
  subtitle?: string;
  accentColor?: string;
  loading?: boolean;
  animationDelay?: number;
};

export default function SummaryStatCard({
  label,
  value,
  subtitle,
  accentColor,
  loading,
  animationDelay = 0,
}: SummaryStatCardProps): React.JSX.Element {
  if (loading) {
    return <div className="rounded-md skeleton-shimmer h-24 bg-cream-50 border border-ink-200" />;
  }

  return (
    <div
      className="rounded-md animate-fade-in-up bg-white border border-ink-200 p-4"
      style={animationDelay > 0 ? { animationDelay: `${animationDelay}ms`, animationFillMode: "both" } : undefined}
    >
      <p className="font-sans uppercase text-xs tracking-widest font-medium text-ink-500">
        {label}
      </p>
      {/* Data wears sans, not the display serif (brand: sans for data). */}
      <p
        className="font-sans mt-1.5 text-2xl font-semibold tracking-tight leading-none text-ink-900"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs font-sans text-ink-500 mt-1">{subtitle}</p>
      )}
    </div>
  );
}
