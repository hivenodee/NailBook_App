import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NailBook Warm Earth palette — see docs/ui-guidelines.md
        background: "#F8F6F1",       // warm linen
        surface: {
          DEFAULT: "#FFFFFF",
          alt: "#F3EDE6",            // alternating sections, hover
        },
        border: "#E5DFD6",           // warm sand
        text: {
          primary: "#2A2522",        // rich charcoal
          secondary: "#6D6560",
          muted: "#9E958C",          // taupe
        },
        primary: {
          DEFAULT: "#7B8B6A",        // warm sage
          hover: "#667A55",          // deep sage
          light: "#E6EBE1",          // sage tint
        },
        accent: {
          DEFAULT: "#C4A08A",        // rose gold
          light: "#F0E6DD",          // rose mist
        },
        status: {
          success: "#6B8F5C",        // fern
          warning: "#C9993A",        // amber gold
          error: "#BF6B6B",          // dusty rose
          info: "#7A94AA",           // slate blue
        },
      },
      borderRadius: {
        card: "16px",
        button: "12px",
        input: "10px",
      },
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
      },
      fontFamily: {
        sans: [
          "Inter",
          "-apple-system",
          "BlinkMacSystemFont",
          "Segoe UI",
          "sans-serif",
        ],
        display: [
          "DM Serif Display",
          "Georgia",
          "Times New Roman",
          "serif",
        ],
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
      },
      animation: {
        "fade-in-up": "fadeInUp 0.3s ease-out",
        shimmer: "shimmer 1.5s ease-in-out infinite",
      },
    },
  },
  plugins: [],
};

export default config;
