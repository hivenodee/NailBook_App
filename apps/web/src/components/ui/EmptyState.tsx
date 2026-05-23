"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { type LucideIcon } from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

type EmptyStateSize = "sm" | "md" | "lg";

export type EmptyStateAction = {
  label: string;
  onClick: () => void;
};

type BaseProps = {
  title: string;
  description: string;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: EmptyStateSize;
} & Omit<
  React.HTMLAttributes<HTMLDivElement>,
  // framer-motion's HTMLMotionProps redefines these with different signatures
  "children" | "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart" | "onAnimationEnd" | "onAnimationIteration"
>;

type IconVariantPropsWithIcon = BaseProps & {
  variant?: "icon";
  icon: LucideIcon;
  customArt?: never;
  display?: never;
};

type IconVariantPropsWithArt = BaseProps & {
  variant?: "icon";
  icon?: never;
  /** Custom inline SVG (or any React node) that replaces the
   *  cream-100 circle + Lucide icon entirely. */
  customArt: React.ReactNode;
  display?: never;
};

type IconVariantProps = IconVariantPropsWithIcon | IconVariantPropsWithArt;

type TypographicVariantProps = BaseProps & {
  variant: "typographic";
  display: string;
  icon?: LucideIcon;
};

type AsymmetricVariantProps = BaseProps & {
  variant: "asymmetric";
  icon: LucideIcon;
  display?: never;
};

export type EmptyStateProps =
  | IconVariantProps
  | TypographicVariantProps
  | AsymmetricVariantProps;

const ICON_SIZES: Record<
  EmptyStateSize,
  { py: string; circle: string; icon: string; titleGap: string; descGap: string; actionGap: string }
> = {
  sm: {
    py:        "py-12",
    circle:    "h-40 w-40",
    icon:      "h-20 w-20",
    titleGap:  "mt-6",
    descGap:   "mt-2",
    actionGap: "mt-5",
  },
  md: {
    py:        "py-16",
    circle:    "h-[200px] w-[200px]",
    icon:      "h-24 w-24 md:h-[120px] md:w-[120px]",
    titleGap:  "mt-8",
    descGap:   "mt-3",
    actionGap: "mt-6",
  },
  lg: {
    py:        "py-20",
    circle:    "h-[240px] w-[240px]",
    icon:      "h-28 w-28 md:h-36 md:w-36",
    titleGap:  "mt-10",
    descGap:   "mt-4",
    actionGap: "mt-8",
  },
};

// ─── Motion variants ─────────────────────────────────────────────
// Animation order is encoded in each variant's `delay`, not via
// staggerChildren. This way variant cascade works through plain
// wrapper divs (e.g. the left column in the asymmetric variant).
//
// Timing per spec:
//   visual  →  t=0     scale 0.94→1 + fade,  duration 400ms ease-out
//   title   →  t=100   8px slide-up + fade,  duration 300ms ease-out
//   desc    →  t=200   8px slide-up + fade,  duration 300ms ease-out
//   action  →  t=300   fade only,            duration 300ms ease-out

const containerVariants: Variants = {
  hidden: {},
  visible: {},
};

const visualVariants: Variants = {
  hidden: { opacity: 0, scale: 0.96 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: "easeOut" },
  },
};

const titleVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: 0.1 },
  },
};

const descVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut", delay: 0.2 },
  },
};

const actionVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.3, ease: "easeOut", delay: 0.3 },
  },
};

type MotionConfig = {
  containerProps: Record<string, unknown>;
  visual?: Variants;
  title?: Variants;
  desc?: Variants;
  action?: Variants;
};

function useEmptyStateMotion(): MotionConfig {
  const reduce = useReducedMotion();
  if (reduce) {
    // No animation. Motion components render statically.
    return { containerProps: {} };
  }
  return {
    containerProps: {
      initial: "hidden",
      whileInView: "visible",
      viewport: { once: true, amount: 0.3 },
      variants: containerVariants,
    },
    visual: visualVariants,
    title: titleVariants,
    desc: descVariants,
    action: actionVariants,
  };
}

export function EmptyState(props: EmptyStateProps): React.JSX.Element {
  if (props.variant === "typographic") return <TypographicVariant {...props} />;
  if (props.variant === "asymmetric") return <AsymmetricVariant {...props} />;
  return <IconVariant {...props} />;
}

function ActionRow({
  action,
  secondaryAction,
  align = "center",
  topGap = "mt-6",
  variants,
}: {
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  align?: "center" | "start";
  topGap?: string;
  variants?: Variants;
}): React.JSX.Element | null {
  if (!action && !secondaryAction) return null;
  return (
    <motion.div
      variants={variants}
      className={cn(
        "flex flex-col gap-3",
        align === "center" ? "items-center" : "items-start",
        topGap,
      )}
    >
      {action && (
        <Button variant="primary" onClick={action.onClick}>
          {action.label}
        </Button>
      )}
      {secondaryAction && (
        <Button variant="ghost" onClick={secondaryAction.onClick}>
          {secondaryAction.label}
        </Button>
      )}
    </motion.div>
  );
}

function IconVariant(props: IconVariantProps): React.JSX.Element {
  const {
    title,
    description,
    action,
    secondaryAction,
    size = "md",
    className,
    ...rest
  } = props;
  // Discriminate by which prop the consumer provided.
  const customArt = "customArt" in props ? props.customArt : undefined;
  const Icon = "icon" in props ? props.icon : undefined;

  const s = ICON_SIZES[size];
  const m = useEmptyStateMotion();

  return (
    <motion.div
      className={cn("flex flex-col items-center text-center px-4", s.py, className)}
      {...m.containerProps}
      {...rest}
    >
      <motion.div variants={m.visual} aria-hidden="true">
        {customArt ? (
          customArt
        ) : Icon ? (
          <div
            className={cn(
              "flex items-center justify-center rounded-pill bg-cream-100 shrink-0",
              s.circle,
            )}
          >
            <Icon className={cn("text-rust-500", s.icon)} strokeWidth={1} />
          </div>
        ) : null}
      </motion.div>

      <motion.div variants={m.title} className={s.titleGap}>
        <Heading variant="h2">{title}</Heading>
      </motion.div>

      <motion.p
        variants={m.desc}
        className={cn(
          "font-sans text-base text-ink-500 max-w-[400px] leading-relaxed",
          s.descGap,
        )}
      >
        {description}
      </motion.p>

      <ActionRow
        action={action}
        secondaryAction={secondaryAction}
        topGap={s.actionGap}
        variants={m.action}
      />
    </motion.div>
  );
}

function TypographicVariant({
  display,
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...rest
}: TypographicVariantProps): React.JSX.Element {
  const m = useEmptyStateMotion();

  return (
    <motion.div
      className={cn("flex flex-col items-center text-center px-4 py-16", className)}
      {...m.containerProps}
      {...rest}
    >
      <motion.span
        aria-hidden="true"
        variants={m.visual}
        className="font-display leading-none text-ink-200 select-none text-[96px] md:text-[144px]"
      >
        {display}
      </motion.span>

      <motion.div
        variants={m.title}
        className="-mt-6 md:-mt-10 flex items-center gap-2"
      >
        {Icon && (
          <Icon
            className="h-4 w-4 text-rust-500 shrink-0"
            strokeWidth={1.5}
            aria-hidden="true"
          />
        )}
        <Heading variant="h2">{title}</Heading>
      </motion.div>

      <motion.p
        variants={m.desc}
        className="mt-3 font-sans text-base text-ink-500 max-w-[400px] leading-relaxed"
      >
        {description}
      </motion.p>

      <ActionRow
        action={action}
        secondaryAction={secondaryAction}
        variants={m.action}
      />
    </motion.div>
  );
}

function AsymmetricVariant({
  icon: Icon,
  title,
  description,
  action,
  secondaryAction,
  className,
  ...rest
}: AsymmetricVariantProps): React.JSX.Element {
  const m = useEmptyStateMotion();

  return (
    <motion.div
      className={cn(
        "flex items-center justify-between gap-6 py-16 px-6",
        className,
      )}
      {...m.containerProps}
      {...rest}
    >
      {/* Left column. motion.div with no variants is a transparent
          cascade — children still pick up the parent's "visible" state. */}
      <motion.div className="flex-1 flex flex-col items-start max-w-[360px]">
        <motion.div variants={m.title}>
          <Heading variant="h2">{title}</Heading>
        </motion.div>

        <motion.p
          variants={m.desc}
          className="mt-3 font-sans text-base text-ink-500 leading-relaxed"
        >
          {description}
        </motion.p>

        <ActionRow
          action={action}
          secondaryAction={secondaryAction}
          align="start"
          variants={m.action}
        />
      </motion.div>

      {/* Decorative icon. Tailwind rotate-12 stays on the inner element so
          framer-motion's transform on the wrapper (scale) doesn't conflict. */}
      <motion.div
        variants={m.visual}
        aria-hidden="true"
        className="shrink-0"
      >
        <Icon
          className="h-20 w-20 text-cream-200 rotate-12"
          strokeWidth={1}
        />
      </motion.div>
    </motion.div>
  );
}
