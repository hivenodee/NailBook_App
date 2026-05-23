"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";
import { Check } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

type BalanceData = {
  totalInCents: number;
  depositInCents: number;
  balancePaidInCents: number;
  remainingInCents: number;
  isPaid: boolean;
  service: { name: string };
  provider: { businessName: string; slug: string };
  clientName: string | null;
};

function formatPrice(cents: number) {
  return `$${(cents / 100).toFixed(2)}`;
}

export default function PayBalancePage(): React.JSX.Element {
  const { appointmentId } = useParams<{ slug: string; appointmentId: string }>();
  const searchParams = useSearchParams();
  const isSuccess = searchParams.get("status") === "success";

  const [data, setData] = useState<BalanceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [paying, setPaying] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/balance`);
      if (!res.ok) {
        setError("Appointment not found");
        return;
      }
      const json = await res.json();
      setData(json.data);
    } catch {
      setError("Failed to load");
    } finally {
      setLoading(false);
    }
  }, [appointmentId]);

  useEffect(() => {
    load();
  }, [load]);

  // Poll for payment confirmation when returning from Stripe
  useEffect(() => {
    if (!isSuccess || !data || data.isPaid) return;
    const interval = setInterval(async () => {
      try {
        const res = await fetch(`/api/appointments/${appointmentId}/balance`);
        if (res.ok) {
          const json = await res.json();
          setData(json.data);
          if (json.data.isPaid) clearInterval(interval);
        }
      } catch {
        // ignore polling errors
      }
    }, 2000);
    return () => clearInterval(interval);
  }, [isSuccess, data, appointmentId]);

  async function handlePay() {
    setPaying(true);
    try {
      const res = await fetch(`/api/appointments/${appointmentId}/balance/checkout`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.data?.checkoutUrl) {
        window.location.href = json.data.checkoutUrl;
      } else {
        setError(json.error || "Failed to create checkout");
        setPaying(false);
      }
    } catch {
      setError("Something went wrong");
      setPaying(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="h-5 w-32 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <Card padding="lg" className="max-w-sm w-full text-center">
          <p className="text-sm font-sans text-error">{error || "Not found"}</p>
        </Card>
      </div>
    );
  }

  // Already paid
  if (data.isPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <Card padding="lg" className="max-w-sm w-full text-center space-y-4">
          <div className="w-14 h-14 mx-auto bg-success/10 rounded-pill flex items-center justify-center">
            <Check size={24} className="text-success" aria-hidden="true" />
          </div>
          <Heading variant="h3" className="text-2xl">Balance paid</Heading>
          <p className="text-sm font-sans text-ink-500">
            Your balance for {data.service.name} with {data.provider.businessName} has been paid in full.
          </p>
        </Card>
      </div>
    );
  }

  // Success polling state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <Card padding="lg" className="max-w-sm w-full text-center space-y-4">
          <div className="w-8 h-8 mx-auto border-2 border-rust-500 border-t-transparent rounded-pill animate-spin" />
          <Heading variant="h4" className="text-lg">Confirming payment…</Heading>
          <p className="text-sm font-sans text-ink-500">This should only take a moment.</p>
        </Card>
      </div>
    );
  }

  // Balance due
  return (
    <div className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
      <Card padding="lg" className="max-w-sm w-full space-y-6">
        <div className="text-center space-y-1">
          <Heading variant="h3" className="text-2xl">{data.provider.businessName}</Heading>
          <p className="text-sm font-sans text-ink-500">{data.service.name}</p>
          {data.clientName && (
            <p className="text-xs font-sans text-ink-500">for {data.clientName}</p>
          )}
        </div>

        <div className="pt-5 space-y-2 text-sm font-sans border-t border-ink-100">
          <div className="flex justify-between">
            <span className="text-ink-500">Total</span>
            <span className="text-ink-900 font-medium">{formatPrice(data.totalInCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-500">Deposit paid</span>
            <span className="text-ink-700">{formatPrice(data.depositInCents)}</span>
          </div>
          {data.balancePaidInCents > 0 && (
            <div className="flex justify-between">
              <span className="text-ink-500">Balance paid</span>
              <span className="text-ink-700">{formatPrice(data.balancePaidInCents)}</span>
            </div>
          )}
          <div className="flex justify-between pt-3 border-t border-ink-100">
            <span className="font-medium text-ink-900">Remaining</span>
            <span className="font-display text-xl text-ink-900">
              {formatPrice(data.remainingInCents)}
            </span>
          </div>
        </div>

        <Button
          variant="primary"
          size="md"
          className="w-full"
          onClick={handlePay}
          disabled={paying}
        >
          {paying ? "Redirecting…" : `Pay ${formatPrice(data.remainingInCents)}`}
        </Button>
      </Card>
    </div>
  );
}
