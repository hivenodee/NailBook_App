// NailBook design tokens — mirrors tailwind.config.ts
export const colors = {
  background: "#FAF9F7",
  surface: "#FFFFFF",
  border: "#E8E4DF",
  text: {
    primary: "#2D2D2D",
    secondary: "#6B6560",
    muted: "#9C958E",
  },
  primary: {
    DEFAULT: "#7C8C6E",
    hover: "#6B7A5E",
    light: "#E8ECE4",
  },
  accent: {
    rose: "#C9A89C",
    lavender: "#B8A9C9",
  },
  status: {
    success: "#7C8C6E",
    warning: "#D4A853",
    error: "#C27070",
    info: "#7A9CB8",
  },
};

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
  xxl: 48,
};

export const borderRadius = {
  sm: 8,
  md: 12,
  lg: 16,
  full: 9999,
};

export const typography = {
  h1: { fontSize: 28, fontWeight: "700" as const },
  h2: { fontSize: 22, fontWeight: "600" as const },
  h3: { fontSize: 18, fontWeight: "600" as const },
  body: { fontSize: 16, fontWeight: "400" as const },
  caption: { fontSize: 14, fontWeight: "400" as const },
  small: { fontSize: 12, fontWeight: "400" as const },
};
