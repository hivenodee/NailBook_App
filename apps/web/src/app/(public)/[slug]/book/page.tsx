"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useSearchParams, useParams, useRouter } from "next/navigation";

type BookingStep = "time" | "details" | "confirm";

type TimeSlot = {
  startTime: string;
  endTime: string;
  available: boolean;
};

type ServiceData = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  depositType: "NONE" | "FLAT" | "PERCENT";
  depositValue: number;
  provider: {
    businessName: string;
    slug: string;
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

function formatTime(iso: string) {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
  });
}

function formatDate(date: Date) {
  return date.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
  });
}

function getDepositAmount(service: ServiceData) {
  if (service.depositType === "FLAT") return service.depositValue;
  if (service.depositType === "PERCENT")
    return Math.round((service.priceInCents * service.depositValue) / 100);
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

  // Time selection
  const [selectedDate, setSelectedDate] = useState<Date>(getNextDays(1)[0]);
  const [slots, setSlots] = useState<TimeSlot[]>([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<TimeSlot | null>(null);

  // Payment method
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);

  // Client details
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");

  const days = getNextDays(14);

  // Fetch service details
  useEffect(() => {
    if (!serviceId) return;
    fetch(`/api/services/${serviceId}`)
      .then((r) => r.json())
      .then((json) => {
        if (json.data) setService(json.data);
      })
      .finally(() => setLoading(false));
  }, [serviceId]);

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
      setSlots(json.data || []);
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

  const depositAmount = service ? getDepositAmount(service) : 0;
  const availableMethods = service ? getAvailablePaymentMethods(service) : [];
  const availableSlots = slots.filter((s) => s.available);

  // Auto-select first available payment method when entering confirm step
  useEffect(() => {
    if (step === "confirm" && !selectedPaymentMethod && availableMethods.length > 0) {
      setSelectedPaymentMethod(availableMethods[0]);
    }
  }, [step, selectedPaymentMethod, availableMethods]);

  const isCash = selectedPaymentMethod === "CASH";
  const confirmButtonText = submitting
    ? "Booking..."
    : isCash
      ? "Confirm Booking"
      : depositAmount > 0
        ? `Pay ${formatPrice(depositAmount)} Deposit`
        : `Pay ${formatPrice(service?.priceInCents ?? 0)}`;

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
                {service.durationMinutes} min
              </p>
            </div>
            <div className="text-right">
              <p className="font-medium text-sm">
                {formatPrice(service.priceInCents)}
              </p>
              {depositAmount > 0 && (
                <p className="text-xs text-primary">
                  {formatPrice(depositAmount)} deposit
                </p>
              )}
            </div>
          </div>
        </div>

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
              ) : availableSlots.length === 0 ? (
                <p className="text-text-muted text-sm text-center py-grid-4">
                  No available times on {formatDate(selectedDate)}. Try another
                  day.
                </p>
              ) : (
                <div className="grid grid-cols-3 gap-2">
                  {availableSlots.map((slot) => {
                    const isSelected =
                      selectedSlot?.startTime === slot.startTime;
                    return (
                      <button
                        key={slot.startTime}
                        onClick={() => setSelectedSlot(slot)}
                        className={`py-2.5 rounded-button text-sm font-medium transition-colors ${
                          isSelected
                            ? "bg-primary text-white"
                            : "bg-background text-text-secondary hover:bg-primary-light"
                        }`}
                      >
                        {formatTime(slot.startTime)}
                      </button>
                    );
                  })}
                </div>
              )}
            </div>

            <button
              disabled={!selectedSlot}
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
                    { weekday: "long", month: "long", day: "numeric" }
                  )}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Time</span>
                <span className="font-medium">
                  {formatTime(selectedSlot.startTime)}
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Duration</span>
                <span className="font-medium">
                  {service.durationMinutes} min
                </span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Name</span>
                <span className="font-medium">{clientName}</span>
              </div>
              <hr className="border-border" />
              <div className="flex justify-between text-sm">
                <span className="text-text-muted">Total</span>
                <span className="font-semibold">
                  {formatPrice(service.priceInCents)}
                </span>
              </div>
              {!isCash && depositAmount > 0 && (
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
                      {formatPrice(service.priceInCents - depositAmount)}
                    </span>
                  </div>
                </>
              )}
              {isCash && (
                <div className="flex justify-between text-sm">
                  <span className="text-text-muted">Payment</span>
                  <span className="font-medium">Pay at appointment</span>
                </div>
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
