"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AnimatePresence } from "framer-motion";
import { StepShell } from "@/components/booking/StepShell";
import { StepVertical, type ProviderVertical } from "@/components/onboarding/StepVertical";
import { StepNameSlug } from "@/components/onboarding/StepNameSlug";
import { StepPhotoBio } from "@/components/onboarding/StepPhotoBio";
import { StepFirstService, type FirstServiceDraft } from "@/components/onboarding/StepFirstService";
import { StepHours, defaultWeekRules, type WeekRule } from "@/components/onboarding/StepHours";
import { StepReview } from "@/components/onboarding/StepReview";

const TOTAL_STEPS = 6;

type WizardState = {
  step: 1 | 2 | 3 | 4 | 5 | 6;
  direction: "forward" | "backward";
  category: ProviderVertical | null;
  businessName: string;
  slug: string;
  providerId: string | null;
  coverImageUrl: string | null;
  avatarUrl: string | null;
  bio: string;
  service: FirstServiceDraft;
  servicePriceCentsSubmitted: number | null;
  hours: WeekRule[];
};

const INITIAL_STATE: WizardState = {
  step: 1,
  direction: "forward",
  category: null,
  businessName: "",
  slug: "",
  providerId: null,
  coverImageUrl: null,
  avatarUrl: null,
  bio: "",
  service: {
    name: "",
    priceDollars: "",
    durationMinutes: 60,
    depositType: "NONE",
    depositValue: "",
  },
  servicePriceCentsSubmitted: null,
  hours: defaultWeekRules(),
};

export default function OnboardingPage(): React.JSX.Element {
  const router = useRouter();
  const { isLoaded, isSignedIn, user } = useUser();
  const [state, setState] = React.useState<WizardState>(INITIAL_STATE);
  const [submitting, setSubmitting] = React.useState(false);
  const [submitError, setSubmitError] = React.useState<string | null>(null);

  // If already onboarded, bounce to dashboard — protects against deep-linking
  // back to /onboarding after going live.
  React.useEffect(() => {
    if (!isLoaded) return;
    if (!isSignedIn) {
      router.replace("/sign-in");
      return;
    }
    const onboarded = user?.publicMetadata?.onboarded;
    if (onboarded === true) router.replace("/dashboard");
  }, [isLoaded, isSignedIn, user, router]);

  function update(patch: Partial<WizardState>) {
    setState((s) => ({ ...s, ...patch }));
  }

  function goTo(step: WizardState["step"], direction: "forward" | "backward") {
    setSubmitError(null);
    setState((s) => ({ ...s, step, direction }));
  }

  function back() {
    if (state.step === 1) return;
    goTo((state.step - 1) as WizardState["step"], "backward");
  }

  // ─── Step 2 submit: create the Provider record ────────────────────
  async function submitNameSlug(normalizedSlug: string) {
    if (!state.category) return;
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/providers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          businessName: state.businessName.trim(),
          slug: normalizedSlug,
          category: state.category,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Couldn't save your business name");
        return;
      }
      update({
        providerId: json.data.id,
        slug: json.data.slug,
      });
      goTo(3, "forward");
    } catch {
      setSubmitError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 3 submit: save bio (cover/avatar already uploaded) ──────
  async function submitPhotoBio() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/providers/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ bio: state.bio.trim() }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Couldn't save your bio");
        return;
      }
      goTo(4, "forward");
    } catch {
      setSubmitError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 4 submit: create the first service ──────────────────────
  async function submitFirstService() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const priceInCents = Math.round(parseFloat(state.service.priceDollars) * 100);
      const depositValueNum = parseFloat(state.service.depositValue);
      const depositValue =
        state.service.depositType === "NONE"
          ? 0
          : state.service.depositType === "FLAT"
            ? Math.round(depositValueNum * 100)
            : Math.round(depositValueNum);

      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: state.service.name.trim(),
          priceInCents,
          durationMinutes: state.service.durationMinutes,
          depositType: state.service.depositType,
          depositValue,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Couldn't save your service");
        return;
      }
      update({ servicePriceCentsSubmitted: priceInCents });
      goTo(5, "forward");
    } catch {
      setSubmitError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 5 submit: save weekly hours ─────────────────────────────
  async function submitHours() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/availability/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          state.hours.map((r) => ({
            dayOfWeek: r.dayOfWeek,
            startTime: r.startTime,
            endTime: r.endTime,
            isActive: r.isActive,
          })),
        ),
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Couldn't save your hours");
        return;
      }
      goTo(6, "forward");
    } catch {
      setSubmitError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step 6 submit: flip onboardedAt + Clerk metadata, then route ─
  async function goLive() {
    setSubmitting(true);
    setSubmitError(null);
    try {
      const res = await fetch("/api/providers/me/complete-onboarding", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok) {
        setSubmitError(json.error?.message ?? "Couldn't take you live");
        return;
      }
      // Refresh Clerk session so middleware sees fresh publicMetadata.
      await user?.reload();
      router.replace("/dashboard?welcome=1");
    } catch {
      setSubmitError("Network error — try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (!isLoaded) {
    return (
      <main className="min-h-screen bg-cream-50 flex items-center justify-center">
        <div className="skeleton-shimmer h-8 w-32 rounded-md" />
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      {/* Wordmark — no full dashboard nav during onboarding */}
      <header className="border-b border-ink-100">
        <div className="max-w-2xl mx-auto px-6 py-5 flex items-center justify-between">
          <span className="font-display text-xl italic text-ink-900">PoroBook</span>
          <span className="font-sans text-xs text-ink-500 tabular-nums">
            Step {state.step} of {TOTAL_STEPS}
          </span>
        </div>
      </header>

      <section className="max-w-2xl mx-auto px-6 py-10 sm:py-16">
        <AnimatePresence mode="wait" initial={false} custom={state.direction}>
          {state.step === 1 && (
            <StepShell
              key="vertical"
              current={1}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="What do you do?"
              subhead="Pick the closest match. You can describe it more in your bio."
            >
              <StepVertical
                value={state.category}
                onChange={(category) => update({ category })}
                onNext={() => goTo(2, "forward")}
              />
            </StepShell>
          )}

          {state.step === 2 && (
            <StepShell
              key="name-slug"
              current={2}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="Name your business."
              subhead="This is what clients see at the top of your booking page."
              onBack={back}
            >
              <StepNameSlug
                category={state.category!}
                businessName={state.businessName}
                slug={state.slug}
                onChange={(patch) => update(patch)}
                onNext={submitNameSlug}
                submitting={submitting}
                submitError={submitError}
              />
            </StepShell>
          )}

          {state.step === 3 && (
            <StepShell
              key="photo-bio"
              current={3}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="Show your face and your work."
              subhead="Cover sets the vibe. Avatar builds trust. The bio sells the booking."
              onBack={back}
            >
              <StepPhotoBio
                coverImageUrl={state.coverImageUrl}
                avatarUrl={state.avatarUrl}
                bio={state.bio}
                onChange={(patch) => update(patch)}
                onNext={submitPhotoBio}
                submitting={submitting}
                submitError={submitError}
              />
            </StepShell>
          )}

          {state.step === 4 && (
            <StepShell
              key="first-service"
              current={4}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="Add your first service."
              subhead="Most-booked one. You can add the rest from the dashboard later."
              onBack={back}
            >
              <StepFirstService
                draft={state.service}
                onChange={(patch) => update({ service: { ...state.service, ...patch } })}
                onNext={submitFirstService}
                submitting={submitting}
                submitError={submitError}
              />
            </StepShell>
          )}

          {state.step === 5 && (
            <StepShell
              key="hours"
              current={5}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="When are you open?"
              subhead="Your weekly schedule. Clients only see times that match these hours."
              onBack={back}
            >
              <StepHours
                rules={state.hours}
                onChange={(hours) => update({ hours })}
                onNext={submitHours}
                submitting={submitting}
                submitError={submitError}
              />
            </StepShell>
          )}

          {state.step === 6 && (
            <StepShell
              key="review"
              current={6}
              total={TOTAL_STEPS}
              direction={state.direction}
              question="Ready to go live?"
              subhead="One look before clients see it. You can edit everything from the dashboard."
              onBack={back}
            >
              <StepReview
                businessName={state.businessName}
                slug={state.slug}
                bio={state.bio}
                avatarUrl={state.avatarUrl}
                coverImageUrl={state.coverImageUrl}
                serviceName={state.service.name}
                servicePriceInCents={state.servicePriceCentsSubmitted ?? 0}
                serviceDurationMinutes={state.service.durationMinutes}
                hours={state.hours}
                onGoLive={goLive}
                submitting={submitting}
                submitError={submitError}
              />
            </StepShell>
          )}
        </AnimatePresence>
      </section>
    </main>
  );
}
