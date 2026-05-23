"use client";

import * as React from "react";
import { useParams, useRouter, useSearchParams } from "next/navigation";
import { AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { BooksClosedView } from "@/components/booking/BooksClosedView";
import { StepShell } from "@/components/booking/StepShell";
import { StepTime } from "@/components/booking/StepTime";
import { StepDetails } from "@/components/booking/StepDetails";
import { StepIntake } from "@/components/booking/StepIntake";
import { StepReview } from "@/components/booking/StepReview";
import {
  formatPrice,
  getAvailablePaymentMethods,
  getDepositAmount,
  getNextDays,
  toDateStr,
} from "@/components/booking/helpers";
import type {
  AppliedCoupon,
  BookingStep,
  IntakeQuestionData,
  PaymentMethod,
  RecurrenceFreq,
  ServiceData,
  TimeSlot,
  WaitlistTimePref,
} from "@/components/booking/types";

export default function BookPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const serviceId = searchParams.get("service");

  // ─── State ────────────────────────────────────────────────
  const [step, setStep] = React.useState<BookingStep>("time");
  const [direction, setDirection] = React.useState<"forward" | "backward">(
    "forward",
  );
  const [service, setService] = React.useState<ServiceData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const dateParam = searchParams.get("date");
  const [selectedDate, setSelectedDate] = React.useState<Date>(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = new Date(`${dateParam}T12:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return getNextDays(1)[0];
  });
  const [slots, setSlots] = React.useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = React.useState(false);
  const [selectedSlot, setSelectedSlot] = React.useState<TimeSlot | null>(null);

  const [selectedAddOnIds, setSelectedAddOnIds] = React.useState<Set<string>>(
    new Set(),
  );

  const [selectedPaymentMethod, setSelectedPaymentMethod] =
    React.useState<PaymentMethod | null>(null);

  const [clientName, setClientName] = React.useState("");
  const [clientEmail, setClientEmail] = React.useState("");
  const [clientPhone, setClientPhone] = React.useState("");

  const [intakeQuestions, setIntakeQuestions] = React.useState<
    IntakeQuestionData[]
  >([]);
  const [intakeResponses, setIntakeResponses] = React.useState<
    Record<string, string>
  >({});

  const [recurrenceEnabled, setRecurrenceEnabled] = React.useState(false);
  const [recurrenceFreq, setRecurrenceFreq] =
    React.useState<RecurrenceFreq>("WEEKLY");
  const [recurrenceCount, setRecurrenceCount] = React.useState(4);

  const [couponInput, setCouponInput] = React.useState("");
  const [appliedCoupon, setAppliedCoupon] = React.useState<AppliedCoupon | null>(
    null,
  );
  const [couponError, setCouponError] = React.useState<string | null>(null);
  const [couponLoading, setCouponLoading] = React.useState(false);

  // Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = React.useState(false);
  const [waitlistSlot, setWaitlistSlot] = React.useState<TimeSlot | null>(null);
  const [waitlistName, setWaitlistName] = React.useState("");
  const [waitlistEmail, setWaitlistEmail] = React.useState("");
  const [waitlistPhone, setWaitlistPhone] = React.useState("");
  const [waitlistTimePref, setWaitlistTimePref] =
    React.useState<WaitlistTimePref>("ANY");
  const [waitlistSubmitting, setWaitlistSubmitting] = React.useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = React.useState(false);

  const days = getNextDays(service?.provider.bookingWindowDays ?? 14);

  // ─── Effects ──────────────────────────────────────────────
  React.useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s = json.data as ServiceData;
          setService(s);
          const mandatoryIds = s.addOns
            .filter((a) => a.isMandatory)
            .map((a) => a.id);
          if (mandatoryIds.length > 0) {
            setSelectedAddOnIds((prev) => {
              const next = new Set(prev);
              for (const id of mandatoryIds) next.add(id);
              return next;
            });
          }
        }
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

  React.useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/services/${serviceId}/intake`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setIntakeQuestions(json.data);
      })
      .catch(() => {});
  }, [serviceId]);

  React.useEffect(() => {
    setShowWaitlistForm(false);
    setWaitlistSuccess(false);
    setWaitlistSlot(null);
  }, [selectedDate]);

  const fetchSlots = React.useCallback(async () => {
    if (!slug || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/availability/${slug}?date=${toDateStr(selectedDate)}`,
      );
      const json = await res.json();
      const avail = json.data || {};
      setSlots(avail.slots || avail || []);
    } catch {
      setSlots([]);
    } finally {
      setSlotsLoading(false);
    }
  }, [slug, selectedDate]);

  React.useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // ─── Derived ─────────────────────────────────────────────
  const selectedAddOns = React.useMemo(
    () => service?.addOns.filter((a) => selectedAddOnIds.has(a.id)) ?? [],
    [service, selectedAddOnIds],
  );
  const addOnPriceCents = selectedAddOns.reduce(
    (sum, a) => sum + a.priceInCents,
    0,
  );
  const addOnDurationMin = selectedAddOns.reduce(
    (sum, a) => sum + a.durationMinutes,
    0,
  );
  const totalBeforeDiscount =
    (service?.priceInCents ?? 0) + addOnPriceCents;
  const totalDurationMin = (service?.durationMinutes ?? 0) + addOnDurationMin;

  let discountCents = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "PERCENT") {
      discountCents = Math.min(
        Math.round((totalBeforeDiscount * appliedCoupon.value) / 100),
        totalBeforeDiscount,
      );
    } else {
      discountCents = Math.min(appliedCoupon.value, totalBeforeDiscount);
    }
  }
  const totalPriceCents = totalBeforeDiscount - discountCents;
  const depositAmount = service ? getDepositAmount(service, totalPriceCents) : 0;
  const availableMethods = service ? getAvailablePaymentMethods(service) : [];

  // Validate add-on groups
  const unsatisfiedGroupIds = React.useMemo(() => {
    const out = new Set<string>();
    if (!service) return out;
    for (const group of service.addOnGroups) {
      if (group.rule === "OPTIONAL") continue;
      const groupAddOnIds = service.addOns
        .filter((a) => a.groupId === group.id)
        .map((a) => a.id);
      const selectedCount = groupAddOnIds.filter((id) =>
        selectedAddOnIds.has(id),
      ).length;
      if (group.rule === "EXACTLY_ONE" && selectedCount !== 1) {
        out.add(group.id);
      } else if (group.rule === "AT_LEAST_ONE" && selectedCount < 1) {
        out.add(group.id);
      }
    }
    return out;
  }, [service, selectedAddOnIds]);
  const allGroupsSatisfied = unsatisfiedGroupIds.size === 0;

  // Step list (skip intake when no questions)
  const stepList = React.useMemo<BookingStep[]>(() => {
    const arr: BookingStep[] = ["time", "details"];
    if (intakeQuestions.length > 0) arr.push("intake");
    arr.push("review");
    return arr;
  }, [intakeQuestions.length]);
  const currentIdx = stepList.indexOf(step);
  const totalSteps = stepList.length;

  // Auto-select first payment method on review
  React.useEffect(() => {
    if (
      step === "review" &&
      !selectedPaymentMethod &&
      availableMethods.length > 0
    ) {
      setSelectedPaymentMethod(availableMethods[0]);
    }
  }, [step, selectedPaymentMethod, availableMethods]);

  // ─── Handlers ────────────────────────────────────────────
  function goNext() {
    const next = stepList[currentIdx + 1];
    if (!next) return;
    setDirection("forward");
    setStep(next);
  }
  function goBack() {
    const prev = stepList[currentIdx - 1];
    if (prev) {
      setDirection("backward");
      setStep(prev);
    } else {
      router.push(`/${slug}`);
    }
  }

  function toggleAddOn(id: string) {
    if (!service) return;
    const addon = service.addOns.find((a) => a.id === id);
    if (!addon || addon.isMandatory) return;
    const group = addon.groupId
      ? service.addOnGroups.find((g) => g.id === addon.groupId)
      : null;

    setSelectedAddOnIds((prev) => {
      const next = new Set(prev);
      if (group?.rule === "EXACTLY_ONE") {
        const groupIds = service.addOns
          .filter((a) => a.groupId === group.id && !a.isMandatory)
          .map((a) => a.id);
        for (const gId of groupIds) next.delete(gId);
        next.add(id);
        return next;
      }
      if (group?.rule === "AT_LEAST_ONE" && next.has(id)) {
        const groupIds = service.addOns
          .filter((a) => a.groupId === group.id)
          .map((a) => a.id);
        const selectedInGroup = groupIds.filter((gId) => next.has(gId));
        if (selectedInGroup.length <= 1) return prev;
      }
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleApplyCoupon() {
    if (!couponInput.trim() || !serviceId) return;
    setCouponLoading(true);
    setCouponError(null);
    try {
      const res = await fetch("/api/coupons/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: couponInput.trim(), slug, serviceId }),
      });
      const json = await res.json();
      if (json.data?.valid) {
        setAppliedCoupon({
          code: json.data.code,
          type: json.data.type,
          value: json.data.value,
        });
        setCouponError(null);
      } else {
        setCouponError(json.data?.reason || "That code didn't work.");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("We couldn't check that code. Try again.");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  async function handleConfirm() {
    if (!serviceId || !selectedSlot || !selectedPaymentMethod) return;
    setSubmitting(true);
    try {
      const res = await fetch("/api/appointments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          serviceId,
          startTime: selectedSlot.startTime,
          clientName,
          clientEmail,
          clientPhone: clientPhone || undefined,
          paymentMethod: selectedPaymentMethod,
          addOnIds:
            selectedAddOns.length > 0
              ? selectedAddOns.map((a) => a.id)
              : undefined,
          couponCode: appliedCoupon?.code || undefined,
          ...(Object.keys(intakeResponses).length > 0 && {
            intakeResponses: Object.entries(intakeResponses).map(
              ([questionId, answer]) => ({ questionId, answer }),
            ),
          }),
          ...(recurrenceEnabled && {
            recurrence: { frequency: recurrenceFreq, count: recurrenceCount },
          }),
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        alert(json.error?.message || "Something went wrong. Please try again.");
        return;
      }
      if (json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
      } else {
        router.push(
          `/${slug}/confirmation?appointment=${
            json.data?.id || json.data?.appointment?.id || ""
          }`,
        );
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  // ─── Step gates ──────────────────────────────────────────
  const canContinueFromTime =
    !!selectedSlot && allGroupsSatisfied;
  const canContinueFromDetails = !!clientName && !!clientEmail;
  const canContinueFromIntake = !intakeQuestions.some(
    (q) => q.isRequired && !intakeResponses[q.id],
  );

  const isCash = selectedPaymentMethod === "CASH";
  const isFree = totalPriceCents === 0;
  const confirmButtonText = submitting
    ? "Booking…"
    : isFree
      ? "Confirm free booking"
      : isCash
        ? "Confirm booking"
        : depositAmount > 0
          ? `Pay ${formatPrice(depositAmount)} deposit`
          : `Pay ${formatPrice(totalPriceCents)}`;

  // ─── Render ──────────────────────────────────────────────
  if (loading) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50">
        <p className="font-sans text-sm text-ink-500">Loading…</p>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="flex min-h-screen items-center justify-center bg-cream-50">
        <p className="font-sans text-sm text-ink-500">Service not found.</p>
      </main>
    );
  }

  if (service.provider.booksOpen === false) {
    return <BooksClosedView service={service} />;
  }

  // Continue button for the active step
  let continueLabel = "Continue";
  let continueDisabled = false;
  let continueAction: () => void = goNext;

  if (step === "time") {
    continueDisabled = !canContinueFromTime;
  } else if (step === "details") {
    continueDisabled = !canContinueFromDetails;
    continueLabel = stepList.includes("intake") ? "Continue" : "Review";
  } else if (step === "intake") {
    continueDisabled = !canContinueFromIntake;
    continueLabel = "Review";
  } else if (step === "review") {
    continueDisabled = submitting || !selectedPaymentMethod;
    continueLabel = confirmButtonText;
    continueAction = handleConfirm;
  }

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <div className="mx-auto max-w-md px-6 pt-10 pb-32">
        <AnimatePresence mode="wait" initial={false} custom={direction}>
          {step === "time" && (
            <StepShell
              key="time"
              current={currentIdx + 1}
              total={totalSteps}
              direction={direction}
              question="When works for you?"
              onBack={goBack}
            >
              <StepTime
                service={service}
                serviceId={serviceId}
                days={days}
                selectedDate={selectedDate}
                setSelectedDate={setSelectedDate}
                slots={slots}
                slotsLoading={slotsLoading}
                selectedSlot={selectedSlot}
                setSelectedSlot={setSelectedSlot}
                selectedAddOnIds={selectedAddOnIds}
                toggleAddOn={toggleAddOn}
                unsatisfiedGroupIds={unsatisfiedGroupIds}
                recurrenceEnabled={recurrenceEnabled}
                setRecurrenceEnabled={setRecurrenceEnabled}
                recurrenceFreq={recurrenceFreq}
                setRecurrenceFreq={setRecurrenceFreq}
                recurrenceCount={recurrenceCount}
                setRecurrenceCount={setRecurrenceCount}
                waitlistSlot={waitlistSlot}
                setWaitlistSlot={setWaitlistSlot}
                showWaitlistForm={showWaitlistForm}
                setShowWaitlistForm={setShowWaitlistForm}
                waitlistSuccess={waitlistSuccess}
                setWaitlistSuccess={setWaitlistSuccess}
                waitlistName={waitlistName}
                setWaitlistName={setWaitlistName}
                waitlistEmail={waitlistEmail}
                setWaitlistEmail={setWaitlistEmail}
                waitlistPhone={waitlistPhone}
                setWaitlistPhone={setWaitlistPhone}
                waitlistTimePref={waitlistTimePref}
                setWaitlistTimePref={setWaitlistTimePref}
                waitlistSubmitting={waitlistSubmitting}
                setWaitlistSubmitting={setWaitlistSubmitting}
                prefillName={clientName}
                prefillEmail={clientEmail}
                prefillPhone={clientPhone}
              />
            </StepShell>
          )}

          {step === "details" && (
            <StepShell
              key="details"
              current={currentIdx + 1}
              total={totalSteps}
              direction={direction}
              question="Who's this for?"
              subhead="No account needed. Your provider will use this to reach you."
              onBack={goBack}
            >
              <StepDetails
                name={clientName}
                setName={setClientName}
                email={clientEmail}
                setEmail={setClientEmail}
                phone={clientPhone}
                setPhone={setClientPhone}
              />
            </StepShell>
          )}

          {step === "intake" && (
            <StepShell
              key="intake"
              current={currentIdx + 1}
              total={totalSteps}
              direction={direction}
              question="A few quick questions"
              subhead="So your provider can prepare for your appointment."
              onBack={goBack}
            >
              <StepIntake
                questions={intakeQuestions}
                responses={intakeResponses}
                setResponses={setIntakeResponses}
              />
            </StepShell>
          )}

          {step === "review" && selectedSlot && (
            <StepShell
              key="review"
              current={currentIdx + 1}
              total={totalSteps}
              direction={direction}
              question="Ready to book?"
              subhead={`Booking with ${service.provider.businessName}.`}
              onBack={goBack}
            >
              <StepReview
                service={service}
                selectedSlot={selectedSlot}
                selectedAddOns={selectedAddOns}
                totalDurationMin={totalDurationMin}
                totalBeforeDiscount={totalBeforeDiscount}
                discountCents={discountCents}
                totalPriceCents={totalPriceCents}
                depositAmount={depositAmount}
                clientName={clientName}
                recurrenceEnabled={recurrenceEnabled}
                recurrenceFreq={recurrenceFreq}
                recurrenceCount={recurrenceCount}
                appliedCoupon={appliedCoupon}
                couponInput={couponInput}
                setCouponInput={setCouponInput}
                handleApplyCoupon={handleApplyCoupon}
                removeCoupon={removeCoupon}
                couponError={couponError}
                couponLoading={couponLoading}
                availableMethods={availableMethods}
                selectedPaymentMethod={selectedPaymentMethod}
                setSelectedPaymentMethod={setSelectedPaymentMethod}
              />
            </StepShell>
          )}
        </AnimatePresence>
      </div>

      {/* Sticky continue bar */}
      <div className="fixed bottom-0 left-0 right-0 border-t border-ink-200 bg-cream-50 px-6 py-4 z-40 safe-bottom">
        <div className="mx-auto max-w-md">
          <Button
            type="button"
            variant="primary"
            size="lg"
            disabled={continueDisabled}
            onClick={continueAction}
            className="w-full"
          >
            {continueLabel}
          </Button>
        </div>
      </div>
    </main>
  );
}
