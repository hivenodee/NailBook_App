import type { Config } from "tailwindcss";
import { tokens } from "./src/lib/design-tokens";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // Brand — the only actual color
        ember: {
          DEFAULT: "#C8722A",
          deep: "#A85A1E",
          light: "#E8943A",
          glow: "#E8943A",
          subtle: "rgba(200,114,42,0.08)",
          border: "rgba(200,114,42,0.25)",
        },
        gold: {
          DEFAULT: "#B8862A",
          light: "#D4A84B",
        },
        // CSS-variable-driven surfaces (auto-switch with .dark)
        surface: {
          base: "var(--bg-base)",
          card: "var(--bg-card)",
          elevated: "var(--bg-elevated)",
          border: "var(--bg-border)",
          muted: "var(--bg-muted)",
        },
        // Semantic text colors — legacy CSS-var aliases + numbered scale from tokens
        ink: {
          DEFAULT: "var(--text-primary)",
          muted: "var(--text-secondary)",
          subtle: "var(--text-tertiary)",
          inverse: "var(--text-inverse)",
          ...tokens.colors.ink, // 300, 500, 700, 900
        },
        // ── Design-tokens palette (numbered scales) ──
        cream: {
          DEFAULT: "var(--text-primary)", // legacy alias used in 41 files
          ...tokens.colors.cream,         // 50, 100, 200
        },
        rust: tokens.colors.rust,         // 400, 500, 600
        // Status — values from design-tokens
        success: tokens.colors.success,
        warning: tokens.colors.warning,
        error:   tokens.colors.error,
        danger:  "#C0392B", // backward-compat
        // Defaults
        transparent: "transparent",
        current: "currentColor",
        white: "#ffffff",
        black: "#000000",
        // ── Backward-compat semantic aliases ──
        bark: {
          DEFAULT: "var(--bg-card)",
          mid: "var(--bg-border)",
          light: "var(--bg-muted)",
        },
        charcoal: "var(--bg-base)",
        linen: "var(--text-secondary)",
        "warm-gray": "var(--text-tertiary)",
      },
      fontSize: tokens.typography.fontSize as unknown as Record<string, [string, { lineHeight: string }]>,
      fontWeight: { ...tokens.typography.fontWeight },
      spacing: {
        // 8pt grid
        "grid-1": "8px",
        "grid-2": "16px",
        "grid-3": "24px",
        "grid-4": "32px",
        "grid-5": "40px",
        "grid-6": "48px",
      },
      boxShadow: {
        soft: "0 2px 8px rgba(0, 0, 0, 0.06)",
        card: "0 1px 4px rgba(0, 0, 0, 0.04)",
        elevated: "0 8px 24px rgba(0, 0, 0, 0.12)",
        "ember-glow": "0 0 24px rgba(200, 114, 42, 0.08)",
      },
      fontFamily: {
        display: [
          "var(--font-display)",
          "Playfair Display",
          "Georgia",
          "serif",
        ],
        sans: [
          "var(--font-sans)",
          "DM Sans",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        label: [
          "var(--font-label)",
          "Josefin Sans",
          "sans-serif",
        ],
        accent: [
          "var(--font-accent)",
          "Cormorant Garamond",
          "Georgia",
          "serif",
        ],
      },
      borderRadius: {
        // Semantic
        card: "16px",
        button: "12px",
        input: "10px",
        badge: "20px",
        // Token scale
        ...tokens.radius, // none, sm, md, lg, pill
      },
      keyframes: {
        fadeInUp: {
          "0%": { opacity: "0", transform: "translateY(10px)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        shimmer: {
          "0%": { backgroundPosition: "-200% 0" },
          "100%": { backgroundPosition: "200% 0" },
        },
        slideUp: {
          "0%": { opacity: "0", transform: "translateY(100%)" },
          "100%": { opacity: "1", transform: "translateY(0)" },
        },
        scalePop: {
          "0%": { opacity: "0", transform: "scale(0.8)" },
          "100%": { opacity: "1", transform: "scale(1)" },
        },
        fadeIn: {
          "0%": { opacity: "0" },
          "100%": { opacity: "1" },
        },
      },
      animation: {
        "fade-in-up": "fadeInUp 0.3s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
        "slide-up": "slideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1)",
        "scale-pop": "scalePop 0.3s cubic-bezier(0.34, 1.56, 0.64, 1)",
        "fade-in": "fadeIn 0.2s ease-out",
      },
    },
  },
  plugins: [],
};

export default config;
