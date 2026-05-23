import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/**
 * Hand-drawn envelope with a curling line of "smoke" rising from the
 * top, suggesting a message about to arrive. Stroke is `currentColor`.
 */
export function MessagesEmptyArt({ className, ...rest }: Props): React.JSX.Element {
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
      {/* Envelope body */}
      <rect x="36" y="84" width="108" height="68" rx="3" />
      {/* Closed-flap V crease */}
      <path d="M 36 84 L 90 124 L 144 84" />

      {/* Curl of smoke rising from the envelope's top center.
          Two S-bends so it reads as a continuous wisp, not a snake. */}
      <path d="M 90 84 C 96 72 84 64 92 50 C 100 36 84 30 94 18" />

      {/* Tiny accent puffs along the curl */}
      <circle cx="94" cy="56" r="1.25" fill="currentColor" stroke="none" />
      <circle cx="89" cy="38" r="1.25" fill="currentColor" stroke="none" />
    </svg>
  );
}
