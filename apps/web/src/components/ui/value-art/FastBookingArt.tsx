import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/** Hand-drawn clock, second hand pointing past the start mark. Stroke is `currentColor`. */
export function FastBookingArt({ className, ...rest }: Props): React.JSX.Element {
  return (
    <svg
      viewBox="0 0 80 80"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      className={cn("h-16 w-16", className)}
      {...rest}
    >
      {/* Clock face */}
      <circle cx="40" cy="40" r="26" />
      {/* Hour ticks at 12, 3, 6, 9 */}
      <line x1="40" y1="16" x2="40" y2="20" />
      <line x1="64" y1="40" x2="60" y2="40" />
      <line x1="40" y1="64" x2="40" y2="60" />
      <line x1="16" y1="40" x2="20" y2="40" />
      {/* Hands — minute pointing 12, hour resting at 2 */}
      <line x1="40" y1="40" x2="40" y2="22" />
      <line x1="40" y1="40" x2="50" y2="34" />
      {/* Center pin */}
      <circle cx="40" cy="40" r="1.5" fill="currentColor" stroke="none" />
      {/* A small motion dash trailing the second hand for a "tick" feel */}
      <path d="M 50 16 Q 56 14 58 18" />
    </svg>
  );
}
