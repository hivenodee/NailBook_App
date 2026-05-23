import * as React from "react";
import { cn } from "@/lib/cn";

type BadgeVariant = "verified" | "neutral" | "warning" | "status" | "error";

const VARIANTS: Record<BadgeVariant, string> = {
  verified: "bg-success/10 text-success border border-success/30",
  neutral:  "bg-cream-100 text-ink-700 border border-ink-200",
  warning:  "bg-warning/10 text-warning border border-warning/30",
  status:   "bg-cream-100 text-ink-500 border border-ink-200",
  error:    "bg-error/10 text-error border border-error/30",
};

export type BadgeProps = {
  variant?: BadgeVariant;
  ref?: React.Ref<HTMLSpanElement>;
} & React.HTMLAttributes<HTMLSpanElement>;

export function Badge({
  variant = "neutral",
  className,
  children,
  ref,
  ...rest
}: BadgeProps): React.JSX.Element {
  return (
    <span
      ref={ref}
      className={cn(
        "inline-flex items-center gap-1 px-2.5 py-0.5",
        "rounded-pill text-xs font-sans font-medium",
        VARIANTS[variant],
        className,
      )}
      {...rest}
    >
      {children}
    </span>
  );
}
