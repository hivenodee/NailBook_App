import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/** Hand-drawn credit card with a small lock badge in the corner. */
export function SecurePaymentArt({ className, ...rest }: Props): React.JSX.Element {
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
      {/* Card body */}
      <rect x="10" y="22" width="60" height="38" rx="4" />
      {/* Magnetic stripe */}
      <line x1="10" y1="32" x2="70" y2="32" />
      {/* Number suggestion (hand-drawn dashes) */}
      <line x1="16" y1="44" x2="22" y2="44" />
      <line x1="26" y1="44" x2="32" y2="44" />
      <line x1="36" y1="44" x2="42" y2="44" />
      {/* Lock badge in lower-right of the card */}
      <rect x="48" y="46" width="16" height="10" rx="1.5" />
      <path d="M 51 46 L 51 42 Q 51 38 56 38 Q 61 38 61 42 L 61 46" />
    </svg>
  );
}
