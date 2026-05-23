"use client";

import * as React from "react";
import { cn } from "@/lib/cn";

type ButtonVariant = "primary" | "secondary" | "ghost";
type ButtonSize = "sm" | "md" | "lg";

const VARIANTS: Record<ButtonVariant, string> = {
  primary: cn(
    "bg-rust-500 text-cream-50 border border-rust-500",
    "hover:bg-rust-600 hover:border-rust-600",
  ),
  secondary: cn(
    "bg-cream-50 text-ink-900 border border-ink-700",
    "hover:border-ink-900",
  ),
  ghost: cn(
    "bg-transparent text-ink-900 border border-transparent",
    "hover:bg-cream-100",
  ),
};

const SIZES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-sm",
  md: "h-11 px-5 text-base",
  lg: "h-14 px-7 text-lg",
};

export type ButtonProps = {
  variant?: ButtonVariant;
  size?: ButtonSize;
  ref?: React.Ref<HTMLButtonElement>;
} & React.ButtonHTMLAttributes<HTMLButtonElement>;

export function Button({
  variant = "primary",
  size = "md",
  className,
  children,
  ref,
  ...rest
}: ButtonProps): React.JSX.Element {
  return (
    <button
      ref={ref}
      className={cn(
        "inline-flex items-center justify-center font-sans font-medium",
        "rounded-md transition-all duration-200",
        "hover:-translate-y-px",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        "disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:translate-y-0",
        VARIANTS[variant],
        SIZES[size],
        className,
      )}
      {...rest}
    >
      {children}
    </button>
  );
}
