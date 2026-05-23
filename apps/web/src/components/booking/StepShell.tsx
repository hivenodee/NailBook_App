"use client";

import * as React from "react";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

export type StepShellProps = {
  /** Current step index, 1-based. */
  current: number;
  /** Total step count. */
  total: number;
  /** Direction of the most recent transition for slide animation. */
  direction: "forward" | "backward";
  /** Question shown as the screen's headline. */
  question: string;
  /** Optional supporting line under the headline. */
  subhead?: string;
  /** Called when the user taps the back chevron. Hide the chevron by passing undefined. */
  onBack?: () => void;
  children: React.ReactNode;
};

const slideVariants: Variants = {
  enter: (direction: "forward" | "backward") => ({
    opacity: 0,
    x: direction === "forward" ? 64 : -64,
  }),
  center: { opacity: 1, x: 0 },
  exit: (direction: "forward" | "backward") => ({
    opacity: 0,
    x: direction === "forward" ? -64 : 64,
  }),
};

export function StepShell({
  current,
  total,
  direction,
  question,
  subhead,
  onBack,
  children,
}: StepShellProps): React.JSX.Element {
  const reduce = useReducedMotion();

  return (
    <motion.div
      className="w-full"
      custom={direction}
      variants={reduce ? undefined : slideVariants}
      initial={reduce ? false : "enter"}
      animate={reduce ? undefined : "center"}
      exit={reduce ? undefined : "exit"}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      <div className="mb-8 flex items-center gap-3">
        {onBack && (
          <button
            type="button"
            onClick={onBack}
            aria-label="Back"
            className={cn(
              "inline-flex h-11 w-11 sm:h-9 sm:w-9 items-center justify-center rounded-pill",
              "text-ink-700 transition-all duration-200",
              "hover:bg-cream-100 hover:-translate-y-px",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
            )}
          >
            <ArrowLeft size={18} strokeWidth={1.5} />
          </button>
        )}
        <span className="font-display italic text-sm text-ink-500">
          {current} of {total}
        </span>
      </div>

      <Heading
        variant="h1"
        className="text-3xl md:text-4xl tracking-tight"
      >
        {question}
      </Heading>
      {subhead && (
        <p className="mt-3 font-sans text-base text-ink-500 leading-relaxed">
          {subhead}
        </p>
      )}

      <div className="mt-8">{children}</div>
    </motion.div>
  );
}
