"use client";

import * as React from "react";
import Link from "next/link";
import { Check, AlertCircle, RefreshCcw, Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

type StatusResponse = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  requirementsDue?: boolean;
};

export default function StripeReturnPage(): React.JSX.Element {
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [reopening, setReopening] = React.useState(false);

  async function fetchStatus() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/providers/me/stripe/status", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? "Couldn't check your account");
        return;
      }
      setStatus(json.data);
    } catch {
      setErrorMsg("Network error — try again");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchStatus();
  }, []);

  async function reopen() {
    setReopening(true);
    try {
      const res = await fetch("/api/providers/me/stripe/connect", { method: "POST" });
      const json = await res.json();
      if (!res.ok || !json.data?.url) {
        setErrorMsg(json.error?.message ?? "Couldn't reopen Stripe");
        setReopening(false);
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setErrorMsg("Network error — try again");
      setReopening(false);
    }
  }

  const fullyReady = status?.chargesEnabled && status?.payoutsEnabled;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-2 text-sm font-sans text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to dashboard
      </Link>

      <Heading variant="h1" className="mt-6 text-3xl">
        Payout setup
      </Heading>

      <p className="mt-3 font-sans text-base text-ink-500 leading-relaxed">
        Once Stripe finishes verifying your account, card deposits go on. Until
        then, you can still accept cash bookings.
      </p>

      <div className="mt-8 rounded-md border border-ink-200 bg-cream-50 p-6">
        {loading ? (
          <div className="flex items-center gap-3 text-ink-500">
            <Loader2 size={18} strokeWidth={1.5} className="animate-spin" />
            <span className="font-sans text-sm">Checking with Stripe…</span>
          </div>
        ) : errorMsg ? (
          <div className="flex flex-col gap-3">
            <div className="flex items-center gap-2 text-error">
              <AlertCircle size={18} strokeWidth={1.5} />
              <span className="font-sans text-sm">{errorMsg}</span>
            </div>
            <button
              type="button"
              onClick={fetchStatus}
              className="self-start inline-flex items-center gap-2 text-sm font-sans text-ink-700 hover:text-ink-900"
            >
              <RefreshCcw size={14} strokeWidth={1.5} />
              Try again
            </button>
          </div>
        ) : status ? (
          <div className="flex flex-col gap-4">
            <StatusRow
              label="Account connected"
              ready={status.connected}
              detail={status.connected ? "Stripe Standard" : "Not connected"}
            />
            <StatusRow
              label="Card deposits"
              ready={status.chargesEnabled}
              detail={
                status.chargesEnabled
                  ? "Live — clients can pay deposits with card"
                  : "Pending Stripe verification"
              }
            />
            <StatusRow
              label="Payouts to your bank"
              ready={status.payoutsEnabled}
              detail={
                status.payoutsEnabled
                  ? "Live — funds settle on Stripe's schedule"
                  : "Pending Stripe verification"
              }
            />

            {!fullyReady && status.requirementsDue && (
              <p className="font-sans text-sm text-ink-700">
                Stripe needs a little more from you to finish verifying.
              </p>
            )}
          </div>
        ) : null}
      </div>

      <div className="mt-6 flex flex-wrap gap-3">
        {status && !fullyReady && (
          <Button onClick={reopen} disabled={reopening}>
            {reopening ? "Opening Stripe…" : status.connected ? "Finish on Stripe" : "Connect Stripe"}
          </Button>
        )}
        {!loading && (
          <Button variant="secondary" onClick={fetchStatus}>
            Refresh status
          </Button>
        )}
        {fullyReady && (
          <Link
            href="/dashboard"
            className="inline-flex items-center justify-center h-11 px-5 text-base font-sans font-medium bg-rust-500 text-cream-50 border border-rust-500 rounded-md transition-all duration-200 hover:bg-rust-600 hover:border-rust-600 hover:-translate-y-px"
          >
            Back to dashboard
          </Link>
        )}
      </div>
    </div>
  );
}

function StatusRow({
  label,
  ready,
  detail,
}: {
  label: string;
  ready: boolean;
  detail: string;
}): React.JSX.Element {
  return (
    <div className="flex items-start gap-3">
      <span
        className={`mt-0.5 inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-pill border ${
          ready ? "border-success bg-success/10 text-success" : "border-ink-300 bg-cream-50 text-ink-400"
        }`}
        aria-hidden="true"
      >
        {ready ? <Check size={14} strokeWidth={1.5} /> : <Loader2 size={14} strokeWidth={1.5} />}
      </span>
      <div className="flex flex-col">
        <span className="font-sans text-sm font-medium text-ink-900">{label}</span>
        <span className="font-sans text-xs text-ink-500">{detail}</span>
      </div>
    </div>
  );
}
