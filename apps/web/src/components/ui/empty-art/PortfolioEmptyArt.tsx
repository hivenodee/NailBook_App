import * as React from "react";
import { cn } from "@/lib/cn";

type Props = React.SVGAttributes<SVGSVGElement>;

/**
 * Hand-drawn polaroid frame, slightly tilted, with abstract nail-art
 * marks inside the photo opening — a wave, a cuticle-arch, scattered
 * rhinestone dots, plus a caption underline. Stroke is `currentColor`.
 */
export function PortfolioEmptyArt({ className, ...rest }: Props): React.JSX.Element {
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
      {/* Tilt the entire polaroid slightly for a snapshot feel */}
      <g transform="rotate(-4 90 90)">
        {/* Outer frame — taller than wide, classic polaroid */}
        <rect x="44" y="30" width="92" height="120" rx="2" />
        {/* Photo opening — square, with a thicker bottom margin */}
        <rect x="52" y="38" width="76" height="76" rx="1" />

        {/* Abstract nail-art marks inside the photo */}
        {/* A swooping wave near the top */}
        <path d="M 56 56 Q 70 48 80 56 Q 90 64 100 56 Q 112 48 124 56" />
        {/* A cuticle-arch through the middle */}
        <path d="M 66 82 Q 90 72 114 82" />

        {/* Scattered rhinestone dots */}
        <circle cx="62" cy="98" r="2" fill="currentColor" stroke="none" />
        <circle cx="78" cy="104" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="100" cy="100" r="1.5" fill="currentColor" stroke="none" />
        <circle cx="118" cy="106" r="2" fill="currentColor" stroke="none" />

        {/* Caption underline at the bottom of the polaroid */}
        <line x1="62" y1="134" x2="118" y2="134" />
      </g>
    </svg>
  );
}
