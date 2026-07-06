/**
 * PoroBook design tokens — single source of truth.
 *
 * Consumed by `tailwind.config.ts` to generate utility classes
 * (e.g. `bg-cream-50`, `text-ink-900`, `text-rust-500`, `rounded-pill`).
 *
 * Use the `tokens` const directly in TS/JS for runtime values
 * (e.g. inline styles, chart colors, canvas drawing).
 */

export const tokens = {
  colors: {
    cream: {
      50: "#FBF8F3",
      100: "#F5EFE6",
      200: "#EBE2D2",
    },
    rust: {
      400: "#D4843D",
      500: "#C4732A",
      600: "#A85F1F",
    },
    ink: {
      100: "#E8E2DA",
      200: "#D6CDC2",
      300: "#9E9389",
      500: "#6B5F55",
      700: "#3D3530",
      900: "#1A1614",
    },
    success: "#4A7C59",
    warning: "#C4732A",
    error: "#A8423A",
    // Money surfaces only: positive-money data color (chart line, credit
    // amounts, the hero booked figure). Not a status color and not the
    // brand accent. Validated 5.06:1 on white, passes chart chroma floor.
    money: {
      DEFAULT: "#2E7D4A",
      deep: "#1F5A34",
    },
  },

  typography: {
    fontFamily: {
      display: '"Playfair Display", Georgia, serif',
      sans: "Inter, system-ui, -apple-system, BlinkMacSystemFont, sans-serif",
    },
    fontSize: {
      xs:   ["0.75rem",  { lineHeight: "1rem"     }],
      sm:   ["0.875rem", { lineHeight: "1.25rem"  }],
      base: ["1rem",     { lineHeight: "1.5rem"   }],
      lg:   ["1.125rem", { lineHeight: "1.75rem"  }],
      xl:   ["1.25rem",  { lineHeight: "1.75rem"  }],
      "2xl":["1.5rem",   { lineHeight: "2rem"     }],
      "3xl":["1.875rem", { lineHeight: "2.25rem"  }],
      "4xl":["2.25rem",  { lineHeight: "2.5rem"   }],
      "5xl":["3rem",     { lineHeight: "1.1"      }],
      "6xl":["3.75rem",  { lineHeight: "1.05"     }],
    },
    fontWeight: {
      regular:  "400",
      medium:   "500",
      semibold: "600",
      bold:     "700",
    },
  },

  spacing: {
    0:  "0",
    1:  "4px",
    2:  "8px",
    3:  "12px",
    4:  "16px",
    5:  "20px",
    6:  "24px",
    8:  "32px",
    10: "40px",
    12: "48px",
    16: "64px",
    20: "80px",
    24: "96px",
  },

  radius: {
    none: "0",
    sm:   "4px",
    md:   "8px",
    lg:   "12px",
    pill: "999px",
  },
} as const;

export type Tokens = typeof tokens;

export type CreamShade   = keyof typeof tokens.colors.cream;
export type RustShade    = keyof typeof tokens.colors.rust;
export type InkShade     = keyof typeof tokens.colors.ink;
export type StatusColor  = "success" | "warning" | "error";

export type FontFamily   = keyof typeof tokens.typography.fontFamily;
export type FontSize     = keyof typeof tokens.typography.fontSize;
export type FontWeight   = keyof typeof tokens.typography.fontWeight;

export type SpacingToken = keyof typeof tokens.spacing;
export type RadiusToken  = keyof typeof tokens.radius;
