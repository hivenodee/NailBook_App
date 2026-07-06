"use client";

import * as React from "react";
import Link from "next/link";
import { Check, CreditCard, Image as ImageIcon, Share2, ChevronRight, X } from "lucide-react";
import { cn } from "@/lib/cn";

type ChecklistData = {
  stripeChargesEnabled: boolean;
  stripeAccountId: string | null;
  slug: string;
  portfolioCount: number;
};

/**
 * Lightweight checklist surfaced at the top of the dashboard after a provider
 * first goes live. Items disappear as they're completed; once everything is
 * done, the whole component returns null. Local-storage dismissal lets a
 * provider hide it permanently if they don't care.
 */
export function PostLaunchChecklist(): React.JSX.Element | null {
  const [data, setData] = React.useState<ChecklistData | null>(null);
  const [dismissed, setDismissed] = React.useState(false);

  React.useEffect(() => {
    if (typeof window !== "undefined") {
      setDismissed(localStorage.getItem("porobook.checklist.dismissed") === "1");
    }
  }, []);

  React.useEffect(() => {
    if (dismissed) return;
    let cancelled = false;
    (async () => {
      try {
        const [providerRes, mediaRes] = await Promise.all([
          fetch("/api/providers/me", { cache: "no-store" }),
          fetch("/api/media", { cache: "no-store" }),
        ]);
        if (!providerRes.ok) return;
        const providerJson = await providerRes.json();
        const mediaJson = mediaRes.ok ? await mediaRes.json() : { data: [] };
        if (cancelled) return;
        setData({
          stripeChargesEnabled: providerJson.data?.stripeChargesEnabled ?? false,
          stripeAccountId: providerJson.data?.stripeAccountId ?? null,
          slug: providerJson.data?.slug ?? "",
          portfolioCount: Array.isArray(mediaJson.data) ? mediaJson.data.length : 0,
        });
      } catch {
        // Silent — checklist is non-critical.
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [dismissed]);

  if (dismissed || !data) return null;

  const items = [
    {
      key: "stripe",
      done: data.stripeChargesEnabled,
      label: "Turn on card deposits",
      description: data.stripeAccountId
        ? "Stripe's still verifying — finish setup or check status."
        : "Set up payouts so clients can pay deposits with card.",
      href: data.stripeAccountId ? "/dashboard/payouts" : "#stripe-connect",
      icon: CreditCard,
    },
    {
      key: "portfolio",
      done: data.portfolioCount >= 3,
      label: "Add 3 portfolio photos",
      description: "Most-booked providers have at least 3 — work, space, vibe.",
      href: "/dashboard/portfolio",
      icon: ImageIcon,
    },
    {
      key: "share",
      done: false,
      label: "Share your booking link",
      description: `porobook.com/${data.slug} — paste in your IG bio.`,
      href: "/dashboard/profile",
      icon: Share2,
      copyLink: typeof window !== "undefined" ? `${window.location.origin}/${data.slug}` : "",
    },
  ];

  const undone = items.filter((i) => !i.done);
  if (undone.length === 0) return null;

  return (
    <section
      className="relative rounded-md border border-ink-200 bg-cream-50 p-6 animate-fade-in-up"
      aria-label="Finish setting up your profile"
    >
      <button
        type="button"
        onClick={() => {
          localStorage.setItem("porobook.checklist.dismissed", "1");
          setDismissed(true);
        }}
        className="absolute top-3 right-3 inline-flex h-7 w-7 items-center justify-center rounded-pill text-ink-400 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500"
        aria-label="Dismiss checklist"
      >
        <X size={14} strokeWidth={1.5} />
      </button>

      <div className="mb-4">
        <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
          Finish your setup
        </span>
        <p className="mt-1 font-display text-2xl text-ink-900">
          {undone.length} thing{undone.length === 1 ? "" : "s"} left.
        </p>
      </div>

      <ul className="flex flex-col gap-2">
        {items.map((item) => {
          const Icon = item.icon;
          return (
            <li key={item.key}>
              <Link
                href={item.href}
                className={cn(
                  "group flex items-center gap-4 rounded-md border p-4 transition-all duration-200",
                  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                  item.done
                    ? "border-ink-100 bg-cream-100/60"
                    : "border-ink-200 bg-cream-50 hover:border-ink-400 hover:-translate-y-px",
                )}
              >
                <span
                  className={cn(
                    "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-pill border",
                    item.done
                      ? "border-success bg-success/10 text-success"
                      : "border-ink-200 bg-cream-50 text-ink-700",
                  )}
                  aria-hidden="true"
                >
                  {item.done ? (
                    <Check size={16} strokeWidth={1.5} />
                  ) : (
                    <Icon size={16} strokeWidth={1.5} />
                  )}
                </span>
                <span className="flex-1">
                  <span
                    className={cn(
                      "block font-sans text-sm font-medium",
                      item.done ? "text-ink-500 line-through" : "text-ink-900",
                    )}
                  >
                    {item.label}
                  </span>
                  {!item.done && (
                    <span className="block font-sans text-xs text-ink-500 mt-0.5">
                      {item.description}
                    </span>
                  )}
                </span>
                {!item.done && (
                  <ChevronRight
                    size={16}
                    strokeWidth={1.5}
                    className="text-ink-400 transition-transform group-hover:translate-x-0.5"
                  />
                )}
              </Link>
            </li>
          );
        })}
      </ul>

      {/* Inline Stripe Connect launcher for the most common first item */}
      {!data.stripeChargesEnabled && (
        <StripeConnectButton hasAccount={!!data.stripeAccountId} />
      )}
    </section>
  );
}

function StripeConnectButton({ hasAccount }: { hasAccount: boolean }): React.JSX.Element {
  const [loading, setLoading] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  async function go() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/providers/me/stripe/connect", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.data?.url) {
        setErrorMsg(json.error?.message ?? "Couldn't open Stripe");
        setLoading(false);
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setErrorMsg("Network error — try again");
      setLoading(false);
    }
  }

  return (
    <div id="stripe-connect" className="mt-4 pt-4 border-t border-ink-100">
      <button
        type="button"
        onClick={go}
        disabled={loading}
        className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-rust-500 px-5 font-sans text-sm font-medium text-cream-50 border border-rust-500 transition-all duration-200 hover:bg-rust-600 hover:border-rust-600 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:opacity-50 disabled:cursor-not-allowed"
      >
        <CreditCard size={16} strokeWidth={1.5} />
        {loading ? "Opening Stripe…" : hasAccount ? "Continue Stripe setup" : "Set up payouts"}
      </button>
      {errorMsg && (
        <p className="mt-2 text-sm font-sans text-error" role="alert">{errorMsg}</p>
      )}
    </div>
  );
}
