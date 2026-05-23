import * as React from "react";
import { cn } from "@/lib/cn";

type HeadingVariant = "display" | "h1" | "h2" | "h3" | "h4";

const VARIANTS: Record<HeadingVariant, { tag: "h1" | "h2" | "h3" | "h4"; classes: string }> = {
  display: {
    tag: "h1",
    classes: "font-display text-5xl leading-[1.05] tracking-tight",
  },
  h1: {
    tag: "h1",
    classes: "font-display text-4xl leading-[1.1] tracking-tight",
  },
  h2: {
    tag: "h2",
    classes: "font-display text-3xl leading-[1.15] tracking-tight",
  },
  h3: {
    tag: "h3",
    classes: "font-display text-2xl leading-[1.2]",
  },
  h4: {
    tag: "h4",
    classes: "font-display text-xl leading-[1.3]",
  },
};

export type HeadingProps = {
  variant?: HeadingVariant;
  as?: "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
  ref?: React.Ref<HTMLHeadingElement>;
} & React.HTMLAttributes<HTMLHeadingElement>;

export function Heading({
  variant = "h1",
  as,
  className,
  children,
  ref,
  ...rest
}: HeadingProps): React.JSX.Element {
  const config = VARIANTS[variant];
  const Tag = (as ?? config.tag) as React.ElementType;

  return (
    <Tag
      ref={ref}
      className={cn("text-ink-900", config.classes, className)}
      {...rest}
    >
      {children}
    </Tag>
  );
}
