import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        // NailBook design tokens from design.md
        background: "#FAF9F7",       // warm off-white
        surface: "#FFFFFF",
        border: "#E8E4DF",           // warm border
        text: {
          primary: "#2D2D2D",        // charcoal, not pure black
          secondary: "#6B6560",
          muted: "#9C958E",
        },
        primary: {
          DEFAULT: "#7C8C6E",        // muted sage
          hover: "#6B7A5E",
          light: "#E8ECE4",
        },
        accent: {
          rose: "#C9A89C",           // rose gold
          lavender: "#B8A9C9",
        },
        status: {
          success: "#7C8C6E",
          warning: "#D4A853",
          error: "#C27070",
          info: "#7A9CB8",
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
      },
    },
  },
  plugins: [],
};

export default config;
