"use client";

import * as React from "react";
import { ExternalLink, Copy, Check } from "lucide-react";
import { Button } from "@/components/ui/Button";
import type { WeekRule } from "./StepHours";

const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function formatTimeLabel(hhmm: string): string {
  const [hStr, mStr] = hhmm.split(":");
  const h24 = Number(hStr);
  const m = Number(mStr);
  const period = h24 >= 12 ? "PM" : "AM";
  const h12 = h24 % 12 === 0 ? 12 : h24 % 12;
  return `${h12}:${String(m).padStart(2, "0")} ${period}`;
}

export function StepReview({
  businessName,
  slug,
  bio,
  avatarUrl,
  coverImageUrl,
  serviceName,
  servicePriceInCents,
  serviceDurationMinutes,
  hours,
  onGoLive,
  submitting,
  submitError,
}: {
  businessName: string;
  slug: string;
  bio: string;
  avatarUrl: string | null;
  coverImageUrl: string | null;
  serviceName: string;
  servicePriceInCents: number;
  serviceDurationMinutes: number;
  hours: WeekRule[];
  onGoLive: () => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}): React.JSX.Element {
  const [copied, setCopied] = React.useState(false);
  const publicUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/${slug}`
      : `/${slug}`;

  async function copy() {
    try {
      await navigator.clipboard.writeText(publicUrl);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // ignore
    }
  }

  const activeHours = hours.filter((h) => h.isActive);

  return (
    <div className="flex flex-col gap-6">
      {/* Profile preview card */}
      <div className="overflow-hidden rounded-md border border-ink-200 bg-cream-50">
        <div className="relative aspect-[3/1] bg-cream-100">
          {coverImageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={coverImageUrl} alt="" className="h-full w-full object-cover" />
          ) : null}
        </div>
        <div className="relative px-6 pb-6">
          <div className="-mt-10 mb-3 h-20 w-20 overflow-hidden rounded-pill border-4 border-cream-50 bg-cream-100">
            {avatarUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={avatarUrl} alt="" className="h-full w-full object-cover" />
            ) : null}
          </div>
          <h3 className="font-display text-2xl text-ink-900">{businessName}</h3>
          <p className="mt-1 font-sans text-sm text-ink-500">porobook.com/{slug}</p>
          {bio && (
            <p className="mt-3 font-sans text-base text-ink-700 leading-relaxed">
              {bio}
            </p>
          )}
        </div>
      </div>

      {/* First service summary */}
      <div className="rounded-md border border-ink-200 bg-cream-50 p-5">
        <div className="flex items-baseline justify-between gap-3">
          <span className="font-sans text-sm font-medium text-ink-500 uppercase tracking-wide">First service</span>
        </div>
        <div className="mt-2 flex items-baseline justify-between gap-3">
          <span className="font-sans text-lg text-ink-900">{serviceName}</span>
          <span className="font-display text-xl text-ink-900">
            ${(servicePriceInCents / 100).toFixed(2)}
          </span>
        </div>
        <p className="mt-1 font-sans text-sm text-ink-500">
          {serviceDurationMinutes >= 60
            ? `${Math.floor(serviceDurationMinutes / 60)}h${serviceDurationMinutes % 60 ? ` ${serviceDurationMinutes % 60}m` : ""}`
            : `${serviceDurationMinutes} min`}
        </p>
      </div>

      {/* Hours summary */}
      <div className="rounded-md border border-ink-200 bg-cream-50 p-5">
        <span className="font-sans text-sm font-medium text-ink-500 uppercase tracking-wide">Hours</span>
        <ul className="mt-3 grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-1.5">
          {activeHours.map((r) => (
            <li key={r.dayOfWeek} className="flex items-center justify-between font-sans text-sm">
              <span className="text-ink-700">{DAY_LABELS[r.dayOfWeek]}</span>
              <span className="text-ink-900 tabular-nums">
                {formatTimeLabel(r.startTime)} – {formatTimeLabel(r.endTime)}
              </span>
            </li>
          ))}
        </ul>
      </div>

      {/* Share bar */}
      <div className="rounded-md border border-ink-200 bg-cream-50 p-5">
        <span className="font-sans text-sm font-medium text-ink-500 uppercase tracking-wide">Your booking link</span>
        <div className="mt-3 flex flex-col sm:flex-row gap-2">
          <div className="flex-1 flex items-center rounded-md border border-ink-200 bg-cream-100 px-4 h-11 overflow-hidden">
            <span className="font-sans text-sm text-ink-900 truncate">{publicUrl}</span>
          </div>
          <button
            type="button"
            onClick={copy}
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-300 bg-cream-50 px-4 font-sans text-sm font-medium text-ink-900 transition-all duration-200 hover:border-ink-900 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            {copied ? <Check size={16} strokeWidth={1.5} /> : <Copy size={16} strokeWidth={1.5} />}
            {copied ? "Copied" : "Copy"}
          </button>
          <a
            href={publicUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-md border border-ink-300 bg-cream-50 px-4 font-sans text-sm font-medium text-ink-900 transition-all duration-200 hover:border-ink-900 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <ExternalLink size={16} strokeWidth={1.5} />
            Preview
          </a>
        </div>
        <p className="mt-3 font-sans text-xs text-ink-500">
          Paste this in your Instagram bio, TikTok bio, or Linktree. Once you go live, anyone with the link can book.
        </p>
      </div>

      {submitError && (
        <p className="text-sm font-sans text-error" role="alert">{submitError}</p>
      )}

      <div className="flex justify-end">
        <Button size="lg" onClick={onGoLive} disabled={submitting}>
          {submitting ? "Going live…" : "Go live"}
        </Button>
      </div>
    </div>
  );
}
