import * as React from "react";
import { cn } from "@/lib/cn";
import { tokens } from "@/lib/design-tokens";

type TextureVariant = "paper" | "linen" | "marble" | "rust";
type TextureIntensity = "subtle" | "medium" | "strong";

const INTENSITY_OPACITY: Record<TextureIntensity, number> = {
  subtle: 0.05,
  medium: 0.10,
  strong: 0.15,
};

export type TextureBackgroundProps = {
  variant?: TextureVariant;
  intensity?: TextureIntensity;
  /** Skip rendering the SVG noise overlay on small viewports for performance. The base color/gradient still renders. */
  disableOnMobile?: boolean;
} & React.HTMLAttributes<HTMLDivElement>;

export function TextureBackground({
  variant = "paper",
  intensity = "subtle",
  disableOnMobile = false,
  className,
  children,
  ...rest
}: TextureBackgroundProps): React.JSX.Element {
  // Stable per-instance ids so multiple TextureBackgrounds on a page don't collide.
  const uid = React.useId().replace(/:/g, "");
  const filterId = `tx-filter-${uid}`;
  const patternId = `tx-pattern-${uid}`;

  const opacity = INTENSITY_OPACITY[intensity];

  // Base color or gradient — always rendered, even when noise is disabled on mobile.
  const baseStyle: React.CSSProperties =
    variant === "rust"
      ? {
          backgroundImage: `linear-gradient(135deg, ${tokens.colors.rust[500]} 0%, ${tokens.colors.rust[600]} 100%)`,
        }
      : {
          backgroundColor:
            variant === "marble"
              ? tokens.colors.cream[100]
              : tokens.colors.cream[50],
        };

  return (
    <div
      className={cn("relative overflow-hidden", className)}
      {...rest}
    >
      <div className="absolute inset-0" style={baseStyle} aria-hidden="true" />

      <svg
        className={cn(
          "absolute inset-0 h-full w-full pointer-events-none",
          disableOnMobile && "hidden md:block",
        )}
        style={{ opacity }}
        aria-hidden="true"
        focusable="false"
        preserveAspectRatio="none"
      >
        <defs>
          {variant === "paper" && (
            <filter id={filterId} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.85"
                numOctaves={2}
                stitchTiles="stitch"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.6 0"
              />
            </filter>
          )}

          {variant === "marble" && (
            <filter id={filterId} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.012 0.018"
                numOctaves={3}
                stitchTiles="stitch"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.16  0 0 0 0 0.13  0 0 0 0 0.11  0 0 0 0.45 0"
              />
            </filter>
          )}

          {variant === "rust" && (
            <filter id={filterId} x="0" y="0" width="100%" height="100%">
              <feTurbulence
                type="fractalNoise"
                baseFrequency="0.95"
                numOctaves={2}
                stitchTiles="stitch"
              />
              <feColorMatrix
                type="matrix"
                values="0 0 0 0 0.10  0 0 0 0 0.07  0 0 0 0 0.05  0 0 0 0.55 0"
              />
            </filter>
          )}

          {variant === "linen" && (
            <>
              <pattern
                id={patternId}
                width="6"
                height="6"
                patternUnits="userSpaceOnUse"
                patternTransform="rotate(0)"
              >
                <path
                  d="M0 0 L6 6"
                  stroke={tokens.colors.ink[700]}
                  strokeWidth="0.5"
                  opacity="0.6"
                />
                <path
                  d="M6 0 L0 6"
                  stroke={tokens.colors.ink[700]}
                  strokeWidth="0.5"
                  opacity="0.6"
                />
              </pattern>
              <filter id={filterId} x="0" y="0" width="100%" height="100%">
                <feTurbulence
                  type="turbulence"
                  baseFrequency="0.7 0.4"
                  numOctaves={2}
                  stitchTiles="stitch"
                />
                <feColorMatrix
                  type="matrix"
                  values="0 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 0.35 0"
                />
              </filter>
            </>
          )}
        </defs>

        {variant === "linen" ? (
          <>
            <rect width="100%" height="100%" fill={`url(#${patternId})`} />
            <rect width="100%" height="100%" filter={`url(#${filterId})`} />
          </>
        ) : (
          <rect width="100%" height="100%" filter={`url(#${filterId})`} />
        )}
      </svg>

      <div className="relative">{children}</div>
    </div>
  );
}
