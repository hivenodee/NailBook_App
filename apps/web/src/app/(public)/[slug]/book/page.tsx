"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";

type BookingStep = "time" | "details" | "confirm";

type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

type AddOnGroupData = {
  id: string;
  name: string;
  rule: "OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE";
  sortOrder: number;
};

type AddOnData = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  groupId: string | null;
  isMandatory: boolean;
  sortOrder: number;
};

type ServiceData = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  depositType: "NONE" | "FLAT" | "PERCENT";
  depositValue: number;
  addOns: AddOnData[];
  addOnGroups: AddOnGroupData[];
  provider: {
    businessName: string;
    slug: string;
    timezone: string;
    cancellationHours: number;
    arrivalGraceMinutes: number;
    acceptsCash: boolean;
    acceptsCard: boolean;
    acceptsApplePay: boolean;
    acceptsGooglePay: boolean;
    acceptsCashAppPay: boolean;
  };
};

type PaymentMethod = "CARD" | "APPLE_PAY" | "GOOGLE_PAY" | "CASH_APP_PAY" | "CASH";

const PAYMENT_METHOD_LABELS: Record<PaymentMethod, string> = {
  APPLE_PAY: "Apple Pay",
  GOOGLE_PAY: "Google Pay",
  CARD: "Card",
  CASH_APP_PAY: "Cash App Pay",
  CASH: "Cash",
};

function getAvailablePaymentMethods(service: ServiceData): PaymentMethod[] {
  const methods: PaymentMethod[] = [];
  const p = service.provider;
  const hasDeposit = service.depositType !== "NONE";

  // Digital methods listed first per design.md
  if (p.acceptsApplePay) methods.push("APPLE_PAY");
  if (p.acceptsGooglePay) methods.push("GOOGLE_PAY");
  if (p.acceptsCard) methods.push("CARD");
  if (p.acceptsCashAppPay) methods.push("CASH_APP_PAY");
  // Cash only when no deposit required
  if (p.acceptsCash && !hasDeposit) methods.push("CASH");

  return methods;
}

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string, tz: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDepositAmount(service: ServiceData, totalCents: number) {
  if (service.depositType === "FLAT") return Math.min(service.depositValue, totalCents);
  if (service.depositType === "PERCENT")
    return Math.round((totalCents * service.depositValue) / 100);
  return 0;
}

function getNextDays(count: number): Date[] {
  const days: Date[] = [];
  const today = new Date();
  for (let i = 1; i <= count; i++) {
    const d = new Date(today);
    d.setDate(today.getDate() + i);
    days.push(d);
  }
  return days;
}

function toDateStr(date: Date) {
  return date.toISOString().split("T")[0];
}

function WaitlistForm({
  serviceId,
  selectedDate,
  waitlistSlot,
  waitlistName,
  setWaitlistName,
  waitlistEmail,
  setWaitlistEmail,
  waitlistPhone,
  setWaitlistPhone,
  waitlistTimePref,
  setWaitlistTimePref,
  waitlistSubmitting,
  setWaitlistSubmitting,
  onSuccess,
}: {
  serviceId: string | null;
  selectedDate: Date;
  waitlistSlot: TimeSlot | null;
  waitlistName: string;
  setWaitlistName: (v: string) => void;
  waitlistEmail: string;
  setWaitlistEmail: (v: string) => void;
  waitlistPhone: string;
  setWaitlistPhone: (v: string) => void;
  waitlistTimePref: "ANY" | "MORNING" | "AFTERNOON" | "EVENING";
  setWaitlistTimePref: (v: "ANY" | "MORNING" | "AFTERNOON" | "EVENING") => void;
  waitlistSubmitting: boolean;
  setWaitlistSubmitting: (v: boolean) => void;
  onSuccess: () => void;
}) {
  return (
    <div className="mt-3 space-y-2 text-left max-w-xs mx-auto">
      <div>
        <label className="block text-xs font-medium mb-0.5">Name</label>
        <input
          type="text"
          value={waitlistName}
          onChange={(e) => setWaitlistName(e.target.value)}
          placeholder="Your name"
          className="w-full border border-border rounded-input px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-0.5">Email</label>
        <input
          type="email"
          value={waitlistEmail}
          onChange={(e) => setWaitlistEmail(e.target.value)}
          placeholder="your@email.com"
          className="w-full border border-border rounded-input px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      <div>
        <label className="block text-xs font-medium mb-0.5">
          Phone <span className="text-text-muted">(optional)</span>
        </label>
        <input
          type="tel"
          value={waitlistPhone}
          onChange={(e) => setWaitlistPhone(e.target.value)}
          placeholder="(555) 123-4567"
          className="w-full border border-border rounded-input px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
        />
      </div>
      {/* Only show time preference for day-level waitlist */}
      {!waitlistSlot && (
        <div>
          <label className="block text-xs font-medium mb-0.5">Time preference</label>
          <select
            value={waitlistTimePref}
            onChange={(e) => setWaitlistTimePref(e.target.value as typeof waitlistTimePref)}
            className="w-full border border-border rounded-input px-3 py-2 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
          >
            <option value="ANY">Any time</option>
            <option value="MORNING">Morning (before 12 PM)</option>
            <option value="AFTERNOON">Afternoon (12–5 PM)</option>
            <option value="EVENING">Evening (after 5 PM)</option>
          </select>
        </div>
      )}
      <button
        type="button"
        disabled={!waitlistName || !waitlistEmail || waitlistSubmitting}
        onClick={async () => {
          if (!serviceId) return;
          setWaitlistSubmitting(true);
          try {
            const res = await fetch("/api/waitlist", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                serviceId,
                targetDate: toDateStr(selectedDate),
                ...(waitlistSlot ? { targetTime: waitlistSlot.startTime } : {}),
                timePreference: waitlistTimePref,
                clientName: waitlistName,
                clientEmail: waitlistEmail,
                clientPhone: waitlistPhone || undefined,
              }),
            });
            if (res.ok) {
              onSuccess();
            } else {
              const json = await res.json();
              alert(json.error?.message || "Failed to join waitlist");
            }
          } catch {
            alert("Something went wrong. Please try again.");
          } finally {
            setWaitlistSubmitting(false);
          }
        }}
        className="w-full bg-primary text-white py-2.5 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
      >
        {waitlistSubmitting ? "Joining..." : "Join Waitlist"}
      </button>
    </div>
  );
}

export default function BookPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const params = useParams();
  const router = useRouter();
  const slug = params.slug as string;
  const serviceId = searchParams.get("service");

  const [step, setStep] = useState<BookingStep>("time");
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Waitlist state
  const [showWaitlistForm, setShowWaitlistForm] = useState(false);
  const [waitlistSlot, setWaitlistSlot] = useState<TimeSlot | null>(null); // per-slot waitlist
  const [waitlistName, setWaitlistName] = useState("");
  const [waitlistEmail, setWaitlistEmail] = useState("");
  const [waitlistPhone, setWaitlistPhone] = useState("");
  const [waitlistTimePref, setWaitlistTimePref] = useState<"ANY" | "MORNING" | "AFTERNOON" | "EVENING">("ANY");
  const [waitlistSubmitting, setWaitlistSubmitting] = useState(false);
  const [waitlistSuccess, setWaitlistSuccess] = useState(false);

  // Pre-select date from URL query param
  const dateParam = searchParams.get("date");

  // Time selection
  const [selectedDate, setSelectedDate] = useState<Date>(() => {
    if (dateParam && /^\d{4}-\d{2}-\d{2}$/.test(dateParam)) {
      const parsed = new Date(`${dateParam}T12:00:00`);
      if (!isNaN(parsed.getTime())) return parsed;
    }
    return getNextDays(1)[0];
  });
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Add-on selection
  const [selectedAddOnIds, setSelectedAddOnIds] = useState<Set<string>>(new Set());

  // Payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Client details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  // Coupon
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<{
    code: string;
    type: "PERCENT" | "FIXED";
    value: number;
  } | null>(null);
  const [couponError, setCouponError] = useState<string | null>(null);
  const [couponLoading, setCouponLoading] = useState(false);

  const days = getNextDays(14);

  // Fetch service details + auto-select mandatory add-ons
  useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) {
          const s = json.data as ServiceData;
          setService(s);
          // Auto-select mandatory add-ons
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

  // Reset waitlist form state when date changes
  useEffect(() => {
    setShowWaitlistForm(false);
    setWaitlistSuccess(false);
    setWaitlistSlot(null);
  }, [selectedDate]);

  // Fetch slots when date changes
  const fetchSlots = useCallback(async () => {
    if (!slug || !selectedDate) return;
    setSlotsLoading(true);
    setSelectedSlot(null);
    try {
      const res = await fetch(
        `/api/availability/${slug}?date=${toDateStr(selectedDate)}`
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

  useEffect(() => {
    fetchSlots();
  }, [fetchSlots]);

  // Submit booking
  const handleConfirm = async () => {
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
          addOnIds: selectedAddOns.length > 0 ? selectedAddOns.map((a) => a.id) : undefined,
          couponCode: appliedCoupon?.code || undefined,
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
        router.push(`/${slug}/confirmation?appointment=${json.data?.id || json.data?.appointment?.id || ""}`);
      }
    } catch {
      alert("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  };

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
        setAppliedCoupon({ code: json.data.code, type: json.data.type, value: json.data.value });
        setCouponError(null);
      } else {
        setCouponError(json.data?.reason || "Invalid coupon code");
        setAppliedCoupon(null);
      }
    } catch {
      setCouponError("Failed to validate coupon");
    } finally {
      setCouponLoading(false);
    }
  }

  function removeCoupon() {
    setAppliedCoupon(null);
    setCouponInput("");
    setCouponError(null);
  }

  function toggleAddOn(id: string) {
    if (!service) return;
    const addon = service.addOns.find((a) => a.id === id);
    if (!addon) return;

    // Can't toggle mandatory add-ons
    if (addon.isMandatory) return;

    const group = addon.groupId
      ? service.addOnGroups.find((g) => g.id === addon.groupId)
      : null;

    setSelectedAddOnIds((prev) => {
      const next = new Set(prev);

      if (group?.rule === "EXACTLY_ONE") {
        // Radio behavior: deselect others in group, select this one
        const groupAddOnIds = service.addOns
          .filter((a) => a.groupId === group.id && !a.isMandatory)
          .map((a) => a.id);
        for (const gId of groupAddOnIds) next.delete(gId);
        next.add(id);
        return next;
      }

      if (group?.rule === "AT_LEAST_ONE" && next.has(id)) {
        // Don't deselect if it's the last one in the group
        const groupAddOnIds = service.addOns
          .filter((a) => a.groupId === group.id)
          .map((a) => a.id);
        const selectedInGroup = groupAddOnIds.filter((gId) => next.has(gId));
        if (selectedInGroup.length <= 1) return prev;
      }

      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // Group validation
  const unsatisfiedGroups: string[] = [];
  if (service) {
    for (const group of service.addOnGroups) {
      if (group.rule === "OPTIONAL") continue;
      const groupAddOnIds = service.addOns
        .filter((a) => a.groupId === group.id)
        .map((a) => a.id);
      const selectedCount = groupAddOnIds.filter((id) => selectedAddOnIds.has(id)).length;
      if (group.rule === "EXACTLY_ONE" && selectedCount !== 1) {
        unsatisfiedGroups.push(group.id);
      } else if (group.rule === "AT_LEAST_ONE" && selectedCount < 1) {
        unsatisfiedGroups.push(group.id);
      }
    }
  }
  const allGroupsSatisfied = unsatisfiedGroups.length === 0;

  const selectedAddOns = service?.addOns.filter((a) => selectedAddOnIds.has(a.id)) ?? [];
  const addOnPriceCents = selectedAddOns.reduce((sum, a) => sum + a.priceInCents, 0);
  const addOnDurationMin = selectedAddOns.reduce((sum, a) => sum + a.durationMinutes, 0);
  const totalBeforeDiscount = (service?.priceInCents ?? 0) + addOnPriceCents;
  const totalDurationMin = (service?.durationMinutes ?? 0) + addOnDurationMin;

  // Calculate discount
  let discountCents = 0;
  if (appliedCoupon) {
    if (appliedCoupon.type === "PERCENT") {
      discountCents = Math.min(Math.round(totalBeforeDiscount * appliedCoupon.value / 100), totalBeforeDiscount);
    } else {
      discountCents = Math.min(appliedCoupon.value, totalBeforeDiscount);
    }
  }
  const totalPriceCents = totalBeforeDiscount - discountCents;
  const depositAmount = service ? getDepositAmount(service, totalPriceCents) : 0;
  const availableMethods = service ? getAvailablePaymentMethods(service) : [];
  const availableSlots = slots.filter((s) => s.available);

  // Auto-select first available payment method when entering confirm step
  useEffect(() => {
    if (step === "confirm" && !selectedPaymentMethod && availableMethods.length > 0) {
      setSelectedPaymentMethod(availableMethods[0]);
    }
  }, [step, selectedPaymentMethod, availableMethods]);

  const isCash = selectedPaymentMethod === "CASH";
  const isFree = totalPriceCents === 0;
  const confirmButtonText = submitting
    ? "Booking..."
    : isFree
      ? "Confirm Free Booking"
      : isCash
        ? "Confirm Booking"
        : depositAmount > 0
          ? `Pay ${formatPrice(depositAmount)} Deposit`
          : `Pay ${formatPrice(totalPriceCents)}`;

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </main>
    );
  }

  if (!service) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Service not found.</p>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-grid-2 py-grid-3">
        {/* Service summary bar */}
        <div className="bg-surface rounded-card p-grid-2 shadow-card mb-grid-3">
          <div className="flex justify-between items-center">
            <div>
              <h3 className="font-medium text-sm">{service.name}</h3>
              <p className="text-xs text-text-muted">
                {totalDurationMin} min
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                {formatPrice(totalPriceCents)}
              </p>
              {depositAmount > 0 && (
                <p className="text-xs text-primary">
                  {formatPrice(depositAmount)} deposit
                </p>
              )}
            </div>
          </div>
          {selectedAddOns.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-1.5">
              {selectedAddOns.map((a) => (
                <span key={a.id} className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
                  +{a.name}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Add-ons selector (grouped) */}
        {service.addOns.length > 0 && (() => {
          // Group add-ons by groupId; ungrouped go at the end
          const groups = service.addOnGroups
            .sort((a, b) => a.sortOrder - b.sortOrder)
            .map((g) => ({
              ...g,
              addOns: service.addOns
                .filter((a) => a.groupId === g.id)
                .sort((a, b) => a.sortOrder - b.sortOrder),
            }));
          const ungrouped = service.addOns
            .filter((a) => !a.groupId)
            .sort((a, b) => a.sortOrder - b.sortOrder);

          const renderAddOn = (addon: AddOnData, isRadio: boolean) => {
            const isSelected = selectedAddOnIds.has(addon.id);
            const isMandatory = addon.isMandatory;
            return (
              <button
                key={addon.id}
                type="button"
                onClick={() => toggleAddOn(addon.id)}
                disabled={isMandatory}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-button text-sm transition-colors border ${
                  isMandatory
                    ? "border-border bg-gray-50 cursor-default opacity-75"
                    : isSelected
                      ? "border-primary bg-primary-light"
                      : "border-border bg-background hover:border-primary/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  {isRadio ? (
                    <div
                      className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                        isSelected ? "border-primary" : "border-border"
                      }`}
                    >
                      {isSelected && (
                        <div className="w-2 h-2 rounded-full bg-primary" />
                      )}
                    </div>
                  ) : (
                    <div
                      className={`w-4 h-4 rounded border flex items-center justify-center ${
                        isSelected
                          ? "bg-primary border-primary"
                          : "border-border"
                      }`}
                    >
                      {isSelected && (
                        <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                        </svg>
                      )}
                    </div>
                  )}
                  <span className={isMandatory ? "text-text-muted" : isSelected ? "font-medium text-primary" : "text-text-secondary"}>
                    {addon.name}
                  </span>
                  {isMandatory && (
                    <span className="text-xs text-text-muted bg-gray-100 px-1.5 py-0.5 rounded-full">(included)</span>
                  )}
                </div>
                <div className="text-right text-xs text-text-muted">
                  <span>+{formatPrice(addon.priceInCents)}</span>
                  {addon.durationMinutes > 0 && (
                    <span className="ml-2">+{addon.durationMinutes} min</span>
                  )}
                </div>
              </button>
            );
          };

          const hasContent = groups.some((g) => g.addOns.length > 0) || ungrouped.length > 0;
          if (!hasContent) return null;

          return (
            <div className="bg-surface rounded-card p-grid-2 shadow-card mb-grid-3 space-y-grid-2">
              <p className="text-sm font-medium">Add-ons</p>

              {groups.map((group) => {
                if (group.addOns.length === 0) return null;
                const isUnsatisfied = unsatisfiedGroups.includes(group.id);
                const isRadio = group.rule === "EXACTLY_ONE";
                return (
                  <div key={group.id} className="space-y-grid-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                        {group.name}
                      </span>
                      {group.rule === "EXACTLY_ONE" && (
                        <span className="text-xs text-text-muted">Choose one</span>
                      )}
                      {group.rule === "AT_LEAST_ONE" && (
                        <span className="text-xs text-text-muted">Select at least one</span>
                      )}
                    </div>
                    {group.addOns.map((addon) => renderAddOn(addon, isRadio))}
                    {isUnsatisfied && (
                      <p className="text-xs text-red-600">
                        {group.rule === "EXACTLY_ONE"
                          ? `Please choose one from "${group.name}"`
                          : `Please select at least one from "${group.name}"`}
                      </p>
                    )}
                  </div>
                );
              })}

              {ungrouped.length > 0 && (
                <div className="space-y-grid-1">
                  {groups.some((g) => g.addOns.length > 0) && (
                    <span className="text-xs font-semibold text-text-secondary uppercase tracking-wide">
                      Other
                    </span>
                  )}
                  {ungrouped.map((addon) => renderAddOn(addon, false))}
                </div>
              )}
            </div>
          );
        })()}

        {/* Step indicator */}
        <div className="flex items-center justify-center gap-grid-2 mb-grid-4">
          {(["time", "details", "confirm"] as const).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                  step === s
                    ? "bg-primary text-white"
                    : "bg-border text-text-muted"
                }`}
              >
                {i + 1}
              </div>
              <span
                className={`text-sm capitalize ${
                  step === s
                    ? "text-text-primary font-medium"
                    : "text-text-muted"
                }`}
              >
                {s}
              </span>
            </div>
          ))}
        </div>

        {/* Step: Select time */}
        {step === "time" && (
          <section className="space-y-grid-2">
            <h2 className="text-xl font-semibold">Select a Time</h2>

            {/* Date picker — horizontal scroll */}
            <div className="flex gap-2 overflow-x-auto pb-2 -mx-grid-2 px-grid-2">
              {days.map((day) => {
                const isSelected =
                  toDateStr(day) === toDateStr(selectedDate);
                return (
                  <button
                    key={toDateStr(day)}
                    onClick={() => setSelectedDate(day)}
                    className={`flex-shrink-0 flex flex-col items-center px-3 py-2 rounded-button text-sm transition-colors ${
                      isSelected
                        ? "bg-primary text-white"
                        : "bg-surface text-text-secondary border border-border hover:border-primary/40"
                    }`}
                  >
                    <span className="text-xs font-medium">
                      {day.toLocaleDateString("en-US", { weekday: "short" })}
                    </span>
                    <span className="text-lg font-semibold">
                      {day.getDate()}
                    </span>
                    <span className="text-xs">
                      {day.toLocaleDateString("en-US", { month: "short" })}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Time slots */}
            <div className="bg-surface rounded-card p-grid-2 shadow-card">
              {slotsLoading ? (
                <p className="text-text-muted text-sm text-center py-grid-4">
                  Loading times...
                </p>
              ) : slots.length === 0 ? (
                /* No schedule for this day at all */
                <div className="py-grid-4 text-center">
                  <p className="text-text-muted text-sm">
                    No times available on {formatDate(selectedDate)}.
                  </p>
                  {waitlistSuccess ? (
                    <p className="text-sm text-green-700 mt-2">
                      You&apos;re on the waitlist! We&apos;ll email you if a spot opens up.
                    </p>
                  ) : !showWaitlistForm ? (
                    <button
                      type="button"
                      onClick={() => {
                        if (clientName && !waitlistName) setWaitlistName(clientName);
                        if (clientEmail && !waitlistEmail) setWaitlistEmail(clientEmail);
                        if (clientPhone && !waitlistPhone) setWaitlistPhone(clientPhone);
                        setWaitlistSlot(null);
                        setShowWaitlistForm(true);
                      }}
                      className="text-sm text-primary hover:underline mt-2 inline-block"
                    >
                      Join waitlist for this day
                    </button>
                  ) : (
                    <WaitlistForm
                      serviceId={serviceId}
                      selectedDate={selectedDate}
                      waitlistSlot={null}
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
                      onSuccess={() => {
                        setWaitlistSuccess(true);
                        setShowWaitlistForm(false);
                      }}
                    />
                  )}
                </div>
              ) : (
                /* Show ALL slots — available + booked */
                <div>
                  <div className="grid grid-cols-3 gap-2">
                    {slots.map((slot) => {
                      const isAvailable = slot.available;
                      const isSelected = selectedSlot?.startTime === slot.startTime;
                      const isWaitlisting = waitlistSlot?.startTime === slot.startTime;

                      if (isAvailable) {
                        return (
                          <button
                            key={slot.startTime}
                            onClick={() => {
                              setSelectedSlot(slot);
                              setWaitlistSlot(null);
                              setShowWaitlistForm(false);
                            }}
                            className={`py-2.5 rounded-button text-sm font-medium transition-colors ${
                              isSelected
                                ? "bg-primary text-white"
                                : "bg-background text-text-secondary hover:bg-primary-light"
                            }`}
                          >
                            {formatTime(slot.startTime, service.provider.timezone)}
                          </button>
                        );
                      }

                      // Booked slot
                      return (
                        <button
                          key={slot.startTime}
                          onClick={() => {
                            setSelectedSlot(null);
                            setWaitlistSlot(slot);
                            setShowWaitlistForm(true);
                            setWaitlistSuccess(false);
                            if (clientName && !waitlistName) setWaitlistName(clientName);
                            if (clientEmail && !waitlistEmail) setWaitlistEmail(clientEmail);
                            if (clientPhone && !waitlistPhone) setWaitlistPhone(clientPhone);
                          }}
                          className={`py-2.5 rounded-button text-sm transition-colors flex flex-col items-center ${
                            isWaitlisting
                              ? "bg-amber-100 border border-amber-400 text-amber-800"
                              : "bg-gray-100 text-gray-400 hover:bg-gray-200"
                          }`}
                        >
                          <span className="font-medium">{formatTime(slot.startTime, service.provider.timezone)}</span>
                          <span className="text-[10px]">Booked</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Per-slot waitlist form */}
                  {waitlistSlot && showWaitlistForm && !waitlistSuccess && (
                    <div className="mt-3 border-t border-border pt-3">
                      <p className="text-sm font-medium text-center mb-2">
                        Join waitlist for {formatTime(waitlistSlot.startTime, service.provider.timezone)} on {formatDate(selectedDate)}
                      </p>
                      <WaitlistForm
                        serviceId={serviceId}
                        selectedDate={selectedDate}
                        waitlistSlot={waitlistSlot}
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
                        onSuccess={() => {
                          setWaitlistSuccess(true);
                          setShowWaitlistForm(false);
                        }}
                      />
                    </div>
                  )}

                  {/* Per-slot waitlist success */}
                  {waitlistSlot && waitlistSuccess && (
                    <p className="text-sm text-green-700 mt-3 text-center">
                      You&apos;re on the waitlist for {formatTime(waitlistSlot.startTime, service.provider.timezone)}! We&apos;ll email you if a spot opens up.
                    </p>
                  )}

                  {/* Day-level waitlist when all slots are booked */}
                  {availableSlots.length === 0 && !waitlistSlot && (
                    <div className="mt-3 border-t border-border pt-3 text-center">
                      <p className="text-text-muted text-sm">All times are booked.</p>
                      {waitlistSuccess ? (
                        <p className="text-sm text-green-700 mt-1">
                          You&apos;re on the waitlist! We&apos;ll email you if a spot opens up.
                        </p>
                      ) : !showWaitlistForm ? (
                        <button
                          type="button"
                          onClick={() => {
                            if (clientName && !waitlistName) setWaitlistName(clientName);
                            if (clientEmail && !waitlistEmail) setWaitlistEmail(clientEmail);
                            if (clientPhone && !waitlistPhone) setWaitlistPhone(clientPhone);
                            setShowWaitlistForm(true);
                          }}
                          className="text-sm text-primary hover:underline mt-1 inline-block"
                        >
                          Join waitlist for this day
                        </button>
                      ) : (
                        <WaitlistForm
                          serviceId={serviceId}
                          selectedDate={selectedDate}
                          waitlistSlot={null}
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
                          onSuccess={() => {
                            setWaitlistSuccess(true);
                            setShowWaitlistForm(false);
                          }}
                        />
                      )}
                    </div>
                  )}
                </div>
              )}
            </div>

            <button
              disabled={!selectedSlot || !allGroupsSatisfied}
              onClick={() => setStep("details")}
              className="w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
            >
              Continue
            </button>
          </section>
        )}

        {/* Step: Client details */}
        {step === "details" && (
          <section className="space-y-grid-2">
            <h2 className="text-xl font-semibold">Your Details</h2>
            <p className="text-text-muted text-sm">
              No account needed — just your info so the nail tech can reach you.
            </p>
            <div className="space-y-grid-2">
              <div>
                <label className="block text-sm font-medium mb-1">Name</label>
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Your name"
                  className="w-full border border-border rounded-input px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">Email</label>
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="your@email.com"
                  className="w-full border border-border rounded-input px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1">
                  Phone <span className="text-text-muted">(optional)</span>
                </label>
                <input
                  type="tel"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="(555) 123-4567"
                  className="w-full border border-border rounded-input px-3 py-2.5 text-sm bg-surface focus:outline-none focus:ring-2 focus:ring-primary/30"
                />
              </div>
            </div>
            <div className="flex gap-grid-1">
              <button
                onClick={() => setStep("time")}
                className="flex-1 py-3 rounded-button text-sm font-medium text-text-secondary hover:bg-border/50 transition-colors"
              >
                Back
              </button>
              <button
                disabled={!clientName || !clientEmail}
                onClick={() => setStep("confirm")}
                className="flex-1 bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                Review Booking
              </button>
            </div>
          </section>
        )}

        {/* Step: Confirm & pay */}
        {step === "confirm" && selectedSlot && (
          <section className="space-y-grid-2">
            <h2 className="text-xl font-semibold">Confirm Booking</h2>

            <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Service</span>
                <span className="font-medium">{service.name}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Date</span>
                <span className="font-medium">
                  {new Date(selectedSlot.startTime).toLocaleDateString(
                    "en-US",
                    { weekday: "long", month: "long", day: "numeric", timeZone: service.provider.timezone }
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Time</span>
                <span className="font-medium">
                  {formatTime(selectedSlot.startTime, service.provider.timezone)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Duration</span>
                <span className="font-medium">
                  {totalDurationMin} min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Name</span>
                <span className="font-medium">{clientName}</span>
              </div>
              {selectedAddOns.length > 0 && (
                <>
                  <hr className="border-border" />
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Base service</span>
                    <span className="font-medium">{formatPrice(service.priceInCents)}</span>
                  </div>
                  {selectedAddOns.map((a) => (
                    <div key={a.id} className="flex justify-between text-sm">
                      <span className="text-text-muted">{a.name}</span>
                      <span className="font-medium">+{formatPrice(a.priceInCents)}</span>
                    </div>
                  ))}
                </>
              )}
              <hr className="border-border" />
              {discountCents > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Subtotal</span>
                    <span className="font-medium">{formatPrice(totalBeforeDiscount)}</span>
                  </div>
                  <div className="flex justify-between text-sm text-green-700">
                    <span>Discount ({appliedCoupon?.code})</span>
                    <span className="font-medium">-{formatPrice(discountCents)}</span>
                  </div>
                </>
              )}
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total</span>
                <span className="font-semibold">
                  {formatPrice(totalPriceCents)}
                </span>
              </div>
              {!isCash && !isFree && depositAmount > 0 && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Due now</span>
                    <span className="font-semibold text-primary">
                      {formatPrice(depositAmount)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-text-muted">Due at appointment</span>
                    <span className="font-medium">
                      {formatPrice(totalPriceCents - depositAmount)}
                    </span>
                  </div>
                </>
              )}
              {isFree && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Payment</span>
                  <span className="font-medium text-green-700">Free</span>
                </div>
              )}
              {isCash && !isFree && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Payment</span>
                  <span className="font-medium">Pay at appointment</span>
                </div>
              )}
            </div>

            {/* Coupon code input */}
            <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
              {appliedCoupon ? (
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium text-green-700">
                      {appliedCoupon.code}
                    </span>
                    <span className="text-xs text-text-muted">
                      {appliedCoupon.type === "PERCENT"
                        ? `${appliedCoupon.value}% off`
                        : `${formatPrice(appliedCoupon.value)} off`}
                    </span>
                  </div>
                  <button
                    onClick={removeCoupon}
                    className="text-xs text-red-600 hover:underline"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <>
                  <p className="text-sm font-medium">Have a code?</p>
                  <div className="flex gap-2">
                    <input
                      type="text"
                      value={couponInput}
                      onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                      placeholder="Enter coupon code"
                      className="flex-1 border border-border rounded-input px-3 py-2 text-sm bg-background focus:outline-none focus:ring-2 focus:ring-primary/30 uppercase"
                    />
                    <button
                      onClick={handleApplyCoupon}
                      disabled={couponLoading || !couponInput.trim()}
                      className="bg-primary text-white px-4 py-2 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
                    >
                      {couponLoading ? "..." : "Apply"}
                    </button>
                  </div>
                  {couponError && (
                    <p className="text-xs text-red-600">{couponError}</p>
                  )}
                </>
              )}
            </div>

            {/* Payment method selector */}
            {availableMethods.length > 0 && (
              <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
                <p className="text-sm font-medium">Payment Method</p>
                <div className="grid gap-2">
                  {availableMethods.map((method) => (
                    <button
                      key={method}
                      onClick={() => setSelectedPaymentMethod(method)}
                      className={`flex items-center px-3 py-2.5 rounded-button text-sm font-medium transition-colors border ${
                        selectedPaymentMethod === method
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border bg-background text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {PAYMENT_METHOD_LABELS[method]}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <div className="bg-surface rounded-card p-grid-2 shadow-card text-xs text-text-muted space-y-1">
              <p>
                Cancellation: Cancel at least{" "}
                {service.provider?.cancellationHours || 24}h in advance for a
                full refund.
              </p>
              <p>
                Arrival: Please arrive within{" "}
                {service.provider?.arrivalGraceMinutes || 15} minutes of your
                appointment time.
              </p>
            </div>

            <div className="flex gap-grid-1">
              <button
                onClick={() => setStep("details")}
                className="flex-1 py-3 rounded-button text-sm font-medium text-text-secondary hover:bg-border/50 transition-colors"
              >
                Back
              </button>
              <button
                disabled={submitting || !selectedPaymentMethod}
                onClick={handleConfirm}
                className="flex-1 bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
              >
                {confirmButtonText}
              </button>
            </div>
          </section>
        )}
      </div>
    </main>
  );
}
