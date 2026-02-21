"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";

type AppointmentData = {
  id: string;
  status: string;
  startTime: string;
  service: { name: string };
  provider: { businessName: string; slug: string; timezone: string };
  payments: { type: string; status: string; amountInCents: number }[];
};

const TIP_PRESETS = [500, 1000, 1500, 2000];

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function TipPage(): React.JSX.Element {
  const params = useParams();
  const searchParams = useSearchParams();
  const appointmentId = params.appointmentId as string;
  const isSuccess = searchParams.get("success") === "true";

  const [appointment, setAppointment] = useState<AppointmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [selectedAmount, setSelectedAmount] = useState<number>(1000);
  const [customAmount, setCustomAmount] = useState("");
  const [isCustom, setIsCustom] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}`);
        const json = await res.json();
        if (!res.ok) {
          setErrorMsg("Appointment not found");
          return;
        }
        setAppointment(json.data);
      } catch {
        setErrorMsg("Something went wrong");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [appointmentId]);

  const existingTip = appointment?.payments.find(
    (p) => p.type === "TIP" && p.status === "COMPLETED"
  );

  async function handleTip() {
    const amount = isCustom ? Math.round(parseFloat(customAmount) * 100) : selectedAmount;
    if (!amount || amount < 100 || amount > 10000) {
      setErrorMsg("Tip must be between $1.00 and $100.00");
      return;
    }
    setSubmitting(true);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/tip/checkout`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ amountInCents: amount }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to create tip");
        return;
      }
      if (json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
      }
    } catch {
      setErrorMsg("Something went wrong");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto px-grid-2 py-grid-3 w-full">
          <div className="bg-surface rounded-card p-grid-3 border border-border/50 skeleton-shimmer space-y-grid-2">
            <div className="h-6 bg-border/60 rounded w-40 mx-auto" />
            <div className="h-4 bg-border/40 rounded w-64 mx-auto" />
            <div className="grid grid-cols-4 gap-2">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-12 bg-border/40 rounded" />
              ))}
            </div>
          </div>
        </div>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">{errorMsg || "Appointment not found"}</p>
      </main>
    );
  }

  if (isSuccess || existingTip) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <div className="max-w-md mx-auto px-grid-2 py-grid-3 text-center space-y-grid-2">
          <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="font-display text-2xl">Thank you!</h1>
          <p className="text-text-muted text-sm">
            Your tip for {appointment.provider.businessName} has been received.
            {existingTip && ` (${formatPrice(existingTip.amountInCents)})`}
          </p>
        </div>
      </main>
    );
  }

  if (appointment.status !== "COMPLETED") {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-secondary">Tips can only be left on completed appointments.</p>
      </main>
    );
  }

  const tz = appointment.provider.timezone;

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-md mx-auto px-grid-2 py-grid-3 space-y-grid-3">
        <div className="text-center space-y-grid-1">
          <h1 className="font-display text-2xl">Leave a Tip</h1>
          <p className="text-text-muted text-sm">
            {appointment.service.name} with {appointment.provider.businessName}
          </p>
          <p className="text-text-muted text-xs">
            {new Date(appointment.startTime).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: tz,
            })}
          </p>
        </div>

        {errorMsg && (
          <div className="bg-red-50 border border-red-200 rounded-card p-grid-2 text-center">
            <p className="text-sm text-red-700">{errorMsg}</p>
          </div>
        )}

        {/* Tip presets */}
        <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((amount) => (
              <button
                key={amount}
                onClick={() => {
                  setSelectedAmount(amount);
                  setIsCustom(false);
                }}
                className={`py-3 rounded-button text-sm font-medium transition-colors border ${
                  !isCustom && selectedAmount === amount
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-text-secondary hover:border-primary/40"
                }`}
              >
                {formatPrice(amount)}
              </button>
            ))}
          </div>

          {/* Custom amount */}
          <div>
            <button
              onClick={() => setIsCustom(true)}
              className={`w-full py-2 rounded-button text-sm font-medium transition-colors border mb-2 ${
                isCustom
                  ? "border-primary bg-primary-light text-primary"
                  : "border-border bg-background text-text-secondary hover:border-primary/40"
              }`}
            >
              Custom amount
            </button>
            {isCustom && (
              <div className="relative">
                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-text-muted">$</span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  className="w-full border border-border rounded-button pl-7 pr-3 py-2.5 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  autoFocus
                />
              </div>
            )}
          </div>
        </div>

        <button
          onClick={handleTip}
          disabled={submitting || (isCustom && (!customAmount || parseFloat(customAmount) < 1))}
          className="w-full bg-primary text-white py-3 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {submitting
            ? "Processing..."
            : `Leave ${isCustom && customAmount ? `$${parseFloat(customAmount).toFixed(2)}` : formatPrice(selectedAmount)} Tip`}
        </button>
      </div>
    </main>
  );
}
