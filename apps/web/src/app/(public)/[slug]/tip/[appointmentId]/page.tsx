"use client";

import React, { useState, useEffect } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

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
    (p) => p.type === "TIP" && p.status === "COMPLETED",
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
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <Card padding="lg" className="max-w-md w-full skeleton-shimmer space-y-4">
          <div className="h-6 rounded-md w-40 mx-auto skeleton-shimmer" />
          <div className="h-4 rounded-md w-64 mx-auto skeleton-shimmer" />
          <div className="grid grid-cols-4 gap-2">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-12 rounded-md skeleton-shimmer" />
            ))}
          </div>
        </Card>
      </main>
    );
  }

  if (!appointment) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <p className="font-sans text-base text-ink-500">{errorMsg || "Appointment not found"}</p>
      </main>
    );
  }

  if (isSuccess || existingTip) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="max-w-md text-center space-y-4">
          <div className="w-16 h-16 bg-success/10 rounded-pill flex items-center justify-center mx-auto">
            <Check size={28} className="text-success" aria-hidden="true" />
          </div>
          <Heading variant="display" className="text-3xl sm:text-4xl">Thank you</Heading>
          <p className="text-sm font-sans text-ink-500">
            Your tip for {appointment.provider.businessName} has been received
            {existingTip ? ` (${formatPrice(existingTip.amountInCents)})` : ""}.
          </p>
        </div>
      </main>
    );
  }

  if (appointment.status !== "COMPLETED") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <p className="font-sans text-base text-ink-500">
          Tips can only be left on completed appointments.
        </p>
      </main>
    );
  }

  const tz = appointment.provider.timezone;

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-md mx-auto px-6 py-12 space-y-8">
        <div className="text-center space-y-1">
          <Heading variant="display" className="text-3xl sm:text-4xl">Leave a tip</Heading>
          <p className="text-sm font-sans text-ink-500">
            {appointment.service.name} with {appointment.provider.businessName}
          </p>
          <p className="text-xs font-sans text-ink-500">
            {new Date(appointment.startTime).toLocaleDateString("en-US", {
              weekday: "long",
              month: "long",
              day: "numeric",
              timeZone: tz,
            })}
          </p>
        </div>

        {errorMsg && (
          <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-center">
            <p className="text-sm font-sans text-error">{errorMsg}</p>
          </div>
        )}

        <Card padding="lg" className="space-y-4">
          <div className="grid grid-cols-4 gap-2">
            {TIP_PRESETS.map((amount) => {
              const active = !isCustom && selectedAmount === amount;
              return (
                <button
                  key={amount}
                  onClick={() => {
                    setSelectedAmount(amount);
                    setIsCustom(false);
                  }}
                  className={
                    "py-3 rounded-md text-sm font-sans font-medium transition-colors border " +
                    (active
                      ? "bg-rust-500 text-cream-50 border-rust-500"
                      : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-500")
                  }
                >
                  {formatPrice(amount)}
                </button>
              );
            })}
          </div>

          <div className="space-y-2">
            <button
              onClick={() => setIsCustom(true)}
              className={
                "w-full py-2 rounded-md text-sm font-sans font-medium transition-colors border " +
                (isCustom
                  ? "bg-rust-500 text-cream-50 border-rust-500"
                  : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-500")
              }
            >
              Custom amount
            </button>
            {isCustom && (
              <div className="relative">
                <span className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-500 font-sans">
                  $
                </span>
                <input
                  type="number"
                  min="1"
                  max="100"
                  step="0.01"
                  value={customAmount}
                  onChange={(e) => setCustomAmount(e.target.value)}
                  placeholder="0.00"
                  autoFocus
                  className="w-full h-11 pl-8 pr-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                />
              </div>
            )}
          </div>
        </Card>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handleTip}
          disabled={submitting || (isCustom && (!customAmount || parseFloat(customAmount) < 1))}
        >
          {submitting
            ? "Processing…"
            : `Leave ${
                isCustom && customAmount
                  ? `$${parseFloat(customAmount).toFixed(2)}`
                  : formatPrice(selectedAmount)
              } tip`}
        </Button>
      </div>
    </main>
  );
}
