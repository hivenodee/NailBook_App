"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "next/navigation";

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
          if (json.data.isPaid) {
            clearInterval(interval);
          }
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
      <div className="min-h-screen flex items-center justify-center bg-background">
        <p className="text-text-muted text-sm">Loading...</p>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface rounded-card p-grid-3 shadow-card max-w-sm w-full text-center">
          <p className="text-red-600 text-sm">{error || "Not found"}</p>
        </div>
      </div>
    );
  }

  // Already paid
  if (data.isPaid) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface rounded-card p-grid-3 shadow-card max-w-sm w-full text-center space-y-grid-2">
          <div className="w-16 h-16 mx-auto bg-green-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h1 className="text-xl font-semibold">Balance Paid</h1>
          <p className="text-text-muted text-sm">
            Your balance for {data.service.name} with {data.provider.businessName} has been paid in full.
          </p>
        </div>
      </div>
    );
  }

  // Success polling state
  if (isSuccess) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="bg-surface rounded-card p-grid-3 shadow-card max-w-sm w-full text-center space-y-grid-2">
          <div className="w-8 h-8 mx-auto border-2 border-primary border-t-transparent rounded-full animate-spin" />
          <h1 className="text-lg font-semibold">Confirming payment...</h1>
          <p className="text-text-muted text-sm">
            This should only take a moment.
          </p>
        </div>
      </div>
    );
  }

  // Balance due
  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4">
      <div className="bg-surface rounded-card p-grid-3 shadow-card max-w-sm w-full space-y-grid-2">
        <div className="text-center">
          <h1 className="text-xl font-semibold">{data.provider.businessName}</h1>
          <p className="text-text-muted text-sm">{data.service.name}</p>
          {data.clientName && (
            <p className="text-text-muted text-xs mt-1">for {data.clientName}</p>
          )}
        </div>

        <div className="border-t border-border pt-grid-2 space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-text-muted">Total</span>
            <span className="font-medium">{formatPrice(data.totalInCents)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-text-muted">Deposit paid</span>
            <span>{formatPrice(data.depositInCents)}</span>
          </div>
          {data.balancePaidInCents > 0 && (
            <div className="flex justify-between">
              <span className="text-text-muted">Balance paid</span>
              <span>{formatPrice(data.balancePaidInCents)}</span>
            </div>
          )}
          <div className="flex justify-between border-t border-border pt-2">
            <span className="font-medium">Remaining</span>
            <span className="font-semibold text-lg">
              {formatPrice(data.remainingInCents)}
            </span>
          </div>
        </div>

        <button
          onClick={handlePay}
          disabled={paying}
          className="w-full bg-primary text-white py-3 rounded-button font-medium text-sm hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {paying ? "Redirecting..." : `Pay ${formatPrice(data.remainingInCents)}`}
        </button>
      </div>
    </div>
  );
}
