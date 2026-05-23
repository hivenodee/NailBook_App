import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/** Hand-drawn phone with a checkmark on screen, suggesting "open in browser, done". */
export function NoAppArt({ className, ...rest }: Props): React.JSX.Element {
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
      {/* Phone outline */}
      <rect x="22" y="10" width="36" height="60" rx="5" />
      {/* Speaker dot */}
      <circle cx="40" cy="16" r="0.8" fill="currentColor" stroke="none" />
      {/* Home bar */}
      <line x1="34" y1="64" x2="46" y2="64" />
      {/* Checkmark on screen */}
      <path d="M 30 42 L 36 48 L 50 32" />
    </svg>
  );
}
