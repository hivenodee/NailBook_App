import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/**
 * Hand-drawn compass-rose with a small bloom growing beside it,
 * suggesting "explore + something taking root." For empty discovery
 * results. Stroke is `currentColor`.
 */
export function DiscoveryEmptyArt({ className, ...rest }: Props): React.JSX.Element {
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
      {/* Compass face */}
      <circle cx="78" cy="86" r="46" />

      {/* North marker — small triangle pointing up */}
      <path d="M 78 36 L 74 48 L 82 48 Z" />

      {/* Cardinal tick marks at S / E / W */}
      <line x1="78" y1="128" x2="78" y2="132" />
      <line x1="120" y1="86" x2="124" y2="86" />
      <line x1="32" y1="86" x2="36" y2="86" />

      {/* Compass needle pointing N */}
      <path d="M 78 86 L 78 56" />
      {/* A tiny tail behind the needle */}
      <path d="M 78 86 L 76 96" />

      {/* Center pin */}
      <circle cx="78" cy="86" r="2" fill="currentColor" stroke="none" />

      {/* Small five-petal bloom in the lower-right, growing on a curving stem */}
      <path d="M 116 152 Q 126 138 138 124" />

      {/* Petals around the bloom center */}
      <g transform="translate(140 120)">
        <circle cx="0" cy="-6" r="3.5" />
        <circle cx="6" cy="-2" r="3.5" />
        <circle cx="3" cy="5" r="3.5" />
        <circle cx="-3" cy="5" r="3.5" />
        <circle cx="-6" cy="-2" r="3.5" />
        <circle cx="0" cy="0" r="1.5" fill="currentColor" stroke="none" />
      </g>

      {/* A single leaf along the stem */}
      <path d="M 124 138 Q 116 138 116 132 Q 122 132 124 138 Z" />
    </svg>
  );
}
