"use client";

import * as React from "react";
import { Check, AlertCircle, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Input } from "@/components/ui/Input";
import { normalizeSlug, MIN_SLUG_LEN, MAX_SLUG_LEN } from "@/lib/slug";
import { cn } from "@/lib/cn";
import type { ProviderVertical } from "./StepVertical";

type SlugStatus =
  | { state: "idle" }
  | { state: "checking" }
  | { state: "available"; normalized: string }
  | { state: "unavailable"; reason: string; suggestions: string[] };

const REASON_COPY: Record<string, string> = {
  "too-short": `Slug must be at least ${MIN_SLUG_LEN} characters.`,
  "too-long": `Slug must be ${MAX_SLUG_LEN} characters or fewer.`,
  reserved: "That handle is reserved.",
  "invalid-chars": "Lowercase letters, numbers, and hyphens only.",
  taken: "That handle is already taken.",
};

export function StepNameSlug({
  category,
  businessName,
  slug,
  onChange,
  onNext,
  submitting,
  submitError,
}: {
  category: ProviderVertical;
  businessName: string;
  slug: string;
  onChange: (next: { businessName?: string; slug?: string }) => void;
  onNext: (normalizedSlug: string) => Promise<void>;
  submitting: boolean;
  submitError: string | null;
}): React.JSX.Element {
  const [status, setStatus] = React.useState<SlugStatus>({ state: "idle" });
  const [userTouchedSlug, setUserTouchedSlug] = React.useState(false);

  // Auto-derive slug from business name until the user edits it manually.
  React.useEffect(() => {
    if (!userTouchedSlug && businessName) {
      const derived = normalizeSlug(businessName);
      if (derived !== slug) onChange({ slug: derived });
    }
  }, [businessName, userTouchedSlug, slug, onChange]);

  // Debounced availability check.
  React.useEffect(() => {
    const normalized = normalizeSlug(slug);
    if (normalized.length < MIN_SLUG_LEN) {
      setStatus({ state: "idle" });
      return;
    }

    setStatus({ state: "checking" });
    const controller = new AbortController();
    const timer = setTimeout(async () => {
      try {
        const url = new URL("/api/providers/slug-available", window.location.origin);
        url.searchParams.set("slug", normalized);
        url.searchParams.set("category", category);
        const res = await fetch(url.toString(), { signal: controller.signal });
        const json = await res.json();
        if (!res.ok) {
          setStatus({ state: "idle" });
          return;
        }
        const { available, normalized: norm, reason, suggestions } = json.data;
        if (available) {
          setStatus({ state: "available", normalized: norm });
        } else {
          setStatus({
            state: "unavailable",
            reason: reason ?? "taken",
            suggestions: suggestions ?? [],
          });
        }
      } catch (e) {
        if (e instanceof DOMException && e.name === "AbortError") return;
        setStatus({ state: "idle" });
      }
    }, 300);

    return () => {
      controller.abort();
      clearTimeout(timer);
    };
  }, [slug, category]);

  const canContinue =
    businessName.trim().length > 0 &&
    status.state === "available" &&
    !submitting;

  async function handleSubmit() {
    if (status.state !== "available") return;
    await onNext(status.normalized);
  }

  const previewSlug =
    status.state === "available" ? status.normalized : normalizeSlug(slug);

  return (
    <div className="flex flex-col gap-6">
      <Input
        label="Business name"
        placeholder="Asha Nail Studio"
        value={businessName}
        onChange={(e) => onChange({ businessName: e.target.value })}
        maxLength={100}
        autoFocus
      />

      <div className="flex flex-col gap-1.5">
        <label htmlFor="onboarding-slug" className="text-sm font-sans font-medium text-ink-700">
          Your booking link
        </label>
        <div
          className={cn(
            "flex items-center gap-0 rounded-md border bg-cream-50 transition-colors duration-200",
            status.state === "unavailable" ? "border-error" : "border-ink-300 focus-within:border-ink-500",
          )}
        >
          <span className="pl-4 pr-1 font-sans text-sm text-ink-500 select-none">
            porobook.com/
          </span>
          <input
            id="onboarding-slug"
            type="text"
            value={slug}
            onChange={(e) => {
              setUserTouchedSlug(true);
              onChange({ slug: e.target.value });
            }}
            placeholder="asha-nails"
            maxLength={MAX_SLUG_LEN}
            className="flex-1 h-11 bg-transparent pr-3 font-sans text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
          <span className="pr-3">
            {status.state === "checking" && (
              <Loader2 size={16} strokeWidth={1.5} className="animate-spin text-ink-400" />
            )}
            {status.state === "available" && (
              <Check size={18} strokeWidth={1.5} className="text-success" />
            )}
            {status.state === "unavailable" && (
              <AlertCircle size={18} strokeWidth={1.5} className="text-error" />
            )}
          </span>
        </div>

        {previewSlug && status.state !== "unavailable" && (
          <p className="text-xs font-sans text-ink-500">
            Lives at <span className="text-ink-700">porobook.com/{previewSlug}</span>
          </p>
        )}

        {status.state === "unavailable" && (
          <div className="flex flex-col gap-2">
            <p className="text-xs font-sans text-error">
              {REASON_COPY[status.reason] ?? "That handle isn't available."}
            </p>
            {status.suggestions.length > 0 && (
              <div className="flex flex-wrap gap-2">
                <span className="text-xs font-sans text-ink-500 self-center">Try:</span>
                {status.suggestions.map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setUserTouchedSlug(true);
                      onChange({ slug: s });
                    }}
                    className="rounded-pill border border-ink-200 bg-cream-50 px-3 py-1 text-xs font-sans text-ink-900 transition-all duration-200 hover:border-ink-400 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                  >
                    {s}
                  </button>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {submitError && (
        <p className="text-sm font-sans text-error" role="alert">{submitError}</p>
      )}

      <div className="flex justify-end">
        <Button
          size="lg"
          onClick={handleSubmit}
          disabled={!canContinue}
          aria-label="Continue to photo and bio"
        >
          {submitting ? "Saving…" : "Continue"}
        </Button>
      </div>
    </div>
  );
}
