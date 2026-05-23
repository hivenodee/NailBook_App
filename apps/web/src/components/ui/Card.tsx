import * as React from "react";
import { cn } from "@/lib/cn";

type CardPadding = "none" | "sm" | "md" | "lg";

const PADDING: Record<CardPadding, string> = {
  none: "p-0",
  sm:   "p-4",
  md:   "p-6",
  lg:   "p-8",
};

export type CardProps = {
  padding?: CardPadding;
  hoverLift?: boolean;
  ref?: React.Ref<HTMLDivElement>;
} & React.HTMLAttributes<HTMLDivElement>;

export function Card({
  padding = "md",
  hoverLift = false,
  className,
  children,
  ref,
  ...rest
}: CardProps): React.JSX.Element {
  return (
    <div
      ref={ref}
      className={cn(
        "bg-cream-50 border border-ink-200 rounded-md",
        "transition-all duration-200",
        hoverLift && "hover:-translate-y-px hover:border-ink-300",
        PADDING[padding],
        className,
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
