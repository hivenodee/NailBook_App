import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/**
 * Hand-drawn calendar with binder rings, a sparse grid of date dots,
 * a leaf sprig in the upper-right corner, and a four-point sparkle
 * in the lower-left. Stroke is `currentColor` so the parent's text
 * color drives it (use `text-rust-500`).
 */
export function BookingsEmptyArt({ className, ...rest }: Props): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 180 180"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-[180px] w-[180px]", className)}
      {...rest}
    >
      {/* Calendar body */}
      <rect x="38" y="50" width="104" height="100" rx="4" />
      {/* Header divider */}
      <line x1="38" y1="74" x2="142" y2="74" />
      {/* Two binder rings (sticks above the body) */}
      <line x1="62" y1="42" x2="62" y2="58" />
      <line x1="118" y1="42" x2="118" y2="58" />

      {/* Date dots — three rows, sparse so it reads as "open" */}
      <circle cx="56" cy="92" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="76" cy="92" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="96" cy="92" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="116" cy="92" r="1.5" fill="currentColor" stroke="none" />

      <circle cx="56" cy="110" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="76" cy="110" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="96" cy="110" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="116" cy="110" r="1.5" fill="currentColor" stroke="none" />

      <circle cx="56" cy="128" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="76" cy="128" r="1.5" fill="currentColor" stroke="none" />
      <circle cx="96" cy="128" r="1.5" fill="currentColor" stroke="none" />

      {/* Leaf sprig in the upper-right corner */}
      <path d="M 152 28 Q 162 30 162 42 Q 152 40 152 28 Z" />
      <path d="M 152 28 L 160 38" />
      <path d="M 152 28 Q 148 22 144 18" />

      {/* Hand-drawn four-point sparkle in the lower-left */}
      <path d="M 26 138 Q 28 144 32 146 Q 28 148 26 154 Q 24 148 20 146 Q 24 144 26 138 Z" />
    </svg>
  );
}
