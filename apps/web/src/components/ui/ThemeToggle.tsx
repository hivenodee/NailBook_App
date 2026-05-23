"use client";

import { useEffect, useState } from "react";

export function ThemeToggle(): React.JSX.Element | null {
  const [dark, setDark] = useState<boolean | null>(null);

  useEffect(() => {
    const stored = localStorage.getItem("porobook-theme");
    const isDark = stored === "dark";
    setDark(isDark);
    document.documentElement.classList.toggle("dark", isDark);
  }, []);

  const toggle = () => {
    const next = !dark;
    setDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("porobook-theme", next ? "dark" : "light");
  };

  if (dark === null) return null;

  return (
    <button
      type="button"
      onClick={toggle}
      role="switch"
      aria-checked={dark}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      title={dark ? "Switch to light mode" : "Switch to dark mode"}
      className={
        "relative h-5 w-9 rounded-pill transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 " +
        (dark ? "bg-rust-500" : "bg-ink-200")
      }
    >
      <span
        className={
          "absolute top-0.5 h-4 w-4 rounded-pill bg-cream-50 shadow-sm transition-transform " +
          (dark ? "left-[18px]" : "left-0.5")
        }
      />
    </button>
  );
}
