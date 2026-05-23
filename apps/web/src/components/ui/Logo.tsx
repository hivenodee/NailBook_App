"use client";

import React from "react";

interface LogoProps {
  /** Visual size of the wordmark */
  size?: "xs" | "sm" | "md" | "lg" | "xl";
  /** Color scheme based on background */
  variant?: "dark" | "light" | "ember";
  /** Show "Black Beauty Booking" tagline beneath */
  showTagline?: boolean;
  className?: string;
}

// Font sizes and dot dimensions per size
const SIZES = {
  xs: { fontSize: 14, dotSize: 3, dotTop: 1, dotLeft: 1 },
  sm: { fontSize: 20, dotSize: 4, dotTop: 2, dotLeft: 1 },
  md: { fontSize: 26, dotSize: 5, dotTop: 3, dotLeft: 2 },
  lg: { fontSize: 36, dotSize: 7, dotTop: 4, dotLeft: 2 },
  xl: { fontSize: 56, dotSize: 10, dotTop: 6, dotLeft: 3 },
};

// Colors per background variant — from design tokens
// Light tagline color is ink-500 (#6B5F55) which meets WCAG AA against cream-50.
const VARIANTS = {
  dark:  { word: "#FBF8F3", dot: "#C4732A", tagline: "rgba(251,248,243,0.65)" },
  light: { word: "#1A1614", dot: "#C4732A", tagline: "#6B5F55" },
  ember: { word: "#FBF8F3", dot: "#FBF8F3", tagline: "rgba(251,248,243,0.75)" },
};

export function Logo({
  size = "md",
  variant = "light",
  showTagline = false,
  className = "",
}: LogoProps): React.JSX.Element {
  const s = SIZES[size];
  const v = VARIANTS[variant];

  return (
    <div
      className={className}
      style={{ display: "inline-flex", flexDirection: "column", userSelect: "none" }}
    >
      {/* Wordmark + ember dot */}
      <div
        className="font-display"
        style={{
          fontWeight: 900,
          fontSize: s.fontSize,
          letterSpacing: "-0.025em",
          lineHeight: 1,
          color: v.word,
          display: "flex",
          alignItems: "flex-start",
        }}
      >
        PoroBook
        {/* Ember dot — the only brand accent */}
        <span
          aria-hidden="true"
          style={{
            display: "inline-block",
            width: s.dotSize,
            height: s.dotSize,
            borderRadius: "50%",
            background: v.dot,
            marginTop: s.dotTop,
            marginLeft: s.dotLeft,
            flexShrink: 0,
          }}
        />
      </div>

      {/* Optional tagline */}
      {showTagline && (
        <div
          className="font-label"
          style={{
            fontWeight: 400,
            fontSize: Math.max(11, Math.round(s.fontSize * 0.28)),
            letterSpacing: "0.45em",
            textTransform: "uppercase",
            color: v.tagline,
            marginTop: Math.round(s.fontSize * 0.14),
          }}
        >
          Black Beauty Booking
        </div>
      )}
    </div>
  );
}

export default Logo;
