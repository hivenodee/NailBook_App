"use client";

import * as React from "react";
import {
  Sparkles,
  Scissors,
  Eye,
  Flower2,
  HandHeart,
  Wand2,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/cn";
import { Button } from "@/components/ui/Button";

export type ProviderVertical =
  | "NAILS"
  | "HAIR"
  | "BROWS_LASHES"
  | "ESTHETICS"
  | "MASSAGE"
  | "OTHER";

type Option = {
  value: ProviderVertical;
  label: string;
  icon: LucideIcon;
  description: string;
};

const OPTIONS: Option[] = [
  { value: "NAILS", label: "Nails", icon: Sparkles, description: "Mani, pedi, acrylics, gels" },
  { value: "HAIR", label: "Hair", icon: Scissors, description: "Cuts, color, braids, locs" },
  { value: "BROWS_LASHES", label: "Brows & Lashes", icon: Eye, description: "Brows, extensions, lifts" },
  { value: "ESTHETICS", label: "Skin", icon: Flower2, description: "Facials, peels, waxing" },
  { value: "MASSAGE", label: "Massage", icon: HandHeart, description: "Bodywork, recovery, spa" },
  { value: "OTHER", label: "Something else", icon: Wand2, description: "Tell us in your bio" },
];

export function StepVertical({
  value,
  onChange,
  onNext,
}: {
  value: ProviderVertical | null;
  onChange: (v: ProviderVertical) => void;
  onNext: () => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-col gap-8">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {OPTIONS.map((opt) => {
          const Icon = opt.icon;
          const selected = value === opt.value;
          return (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange(opt.value)}
              className={cn(
                "group flex items-start gap-3 rounded-md border p-4 text-left transition-all duration-200",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                selected
                  ? "border-rust-500 bg-rust-50/50"
                  : "border-ink-200 bg-cream-50 hover:border-ink-400 hover:-translate-y-px",
              )}
              aria-pressed={selected}
            >
              <span
                className={cn(
                  "inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill border",
                  selected
                    ? "border-rust-500 bg-rust-500 text-cream-50"
                    : "border-ink-200 bg-cream-50 text-ink-700",
                )}
              >
                <Icon size={18} strokeWidth={1.5} />
              </span>
              <span className="flex flex-col">
                <span className="font-sans text-base font-medium text-ink-900">{opt.label}</span>
                <span className="font-sans text-sm text-ink-500">{opt.description}</span>
              </span>
            </button>
          );
        })}
      </div>

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={onNext}
          disabled={!value}
          aria-label="Continue to business name"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}
