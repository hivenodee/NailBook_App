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
    return (
      <div className="bg-surface rounded-card p-grid-2 border border-border/50 skeleton-shimmer h-24" />
    );
  }

  return (
    <div
      className="bg-surface rounded-card p-grid-2 border border-border/50 animate-fade-in-up"
      style={animationDelay > 0 ? { animationDelay: `${animationDelay}ms`, animationFillMode: "both" } : undefined}
    >
      <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
        {label}
      </p>
      <p
        className="font-display text-2xl mt-1"
        style={accentColor ? { color: accentColor } : undefined}
      >
        {value}
      </p>
      {subtitle && (
        <p className="text-xs text-text-muted mt-0.5">{subtitle}</p>
      )}
    </div>
  );
}
