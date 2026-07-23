"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  AlertCircle,
  RefreshCcw,
  Loader2,
  ArrowLeft,
  CreditCard,
  Banknote,
  ShieldCheck,
} from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";
import { SectionRule } from "@/components/ui/SectionRule";
import { cn } from "@/lib/cn";

type StatusResponse = {
  connected: boolean;
  chargesEnabled: boolean;
  payoutsEnabled: boolean;
  detailsSubmitted?: boolean;
  requirementsDue?: boolean;
};

export default function PayoutsPage(): React.JSX.Element {
  const [status, setStatus] = React.useState<StatusResponse | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);
  const [opening, setOpening] = React.useState(false);

  async function fetchStatus() {
    setLoading(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/providers/me/stripe/status", {
        cache: "no-store",
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message ?? "Couldn't check your account");
        return;
      }
      setStatus(json.data);
    } catch {
      setErrorMsg("Network error. Try again.");
    } finally {
      setLoading(false);
    }
  }

  React.useEffect(() => {
    fetchStatus();
  }, []);

  async function openStripe() {
    setOpening(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/providers/me/stripe/connect", {
        method: "POST",
      });
      const json = await res.json();
      if (!res.ok || !json.data?.url) {
        setErrorMsg(json.error?.message ?? "Couldn't open Stripe");
        setOpening(false);
        return;
      }
      window.location.href = json.data.url;
    } catch {
      setErrorMsg("Network error. Try again.");
      setOpening(false);
    }
  }

  const fullyReady = status?.chargesEnabled && status?.payoutsEnabled;

  return (
    <div className="max-w-2xl mx-auto py-6">
      <Link
        href="/dashboard/money"
        className="inline-flex min-h-[44px] items-center gap-2 text-sm font-sans text-ink-500 hover:text-ink-900 transition-colors"
      >
        <ArrowLeft size={14} strokeWidth={1.5} />
        Back to money
      </Link>

      <header className="mt-4 space-y-3">
        <p className="text-label text-ink-500">Money &middot; Payouts</p>
        <Heading variant="h1" className="text-3xl md:text-4xl">
          Payouts
        </Heading>
        <p className="font-sans text-base text-ink-500 max-w-md leading-relaxed">
          Card deposits come in through Stripe and settle to your bank
          automatically. Connect once. Cash bookings never need this.
        </p>
      </header>

      {/* ─── Status card ─── */}
      <div className="mt-8 rounded-md border border-ink-200 bg-white p-6">
        {loading && !status ? (
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
              className="self-start inline-flex min-h-[44px] items-center gap-2 text-sm font-sans text-ink-700 hover:text-ink-900"
            >
              <RefreshCcw size={14} strokeWidth={1.5} />
              Try again
            </button>
          </div>
        ) : status ? (
          <div
            className={cn(
              "flex flex-col gap-4 transition-opacity duration-200",
              loading && "opacity-60 pointer-events-none",
            )}
          >
            <StatusRow
              label="Account connected"
              ready={status.connected}
              detail={status.connected ? "Stripe Standard" : "Not connected yet"}
            />
            <StatusRow
              label="Card deposits"
              ready={status.chargesEnabled}
              detail={
                status.chargesEnabled
                  ? "Live. Clients can pay deposits with card."
                  : status.connected
                    ? "Pending Stripe verification"
                    : "Connect to turn on"
              }
            />
            <StatusRow
              label="Payouts to your bank"
              ready={status.payoutsEnabled}
              detail={
                status.payoutsEnabled
                  ? "Live. Funds settle on Stripe's schedule."
                  : status.connected
                    ? "Pending Stripe verification"
                    : "Connect to turn on"
              }
            />

            {status.connected && !fullyReady && status.requirementsDue && (
              <p className="font-sans text-sm text-ink-700">
                Stripe needs a little more from you to finish verifying.
              </p>
            )}
          </div>
        ) : null}
      </div>

      {/* ─── Actions ─── */}
      <div className="mt-6 flex flex-wrap gap-3">
        {status && !fullyReady && (
          <Button onClick={openStripe} disabled={opening} className="gap-2">
            <CreditCard size={16} strokeWidth={1.5} />
            {opening
              ? "Opening Stripe…"
              : status.connected
                ? "Finish on Stripe"
                : "Set up payouts"}
          </Button>
        )}
        {!loading && (
          <Button variant="secondary" onClick={fetchStatus}>
            Refresh status
          </Button>
        )}
        {fullyReady && (
          <a
            href="https://dashboard.stripe.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            <Button variant="secondary" className="gap-2">
              Open Stripe dashboard
            </Button>
          </a>
        )}
      </div>

      {/* ─── How it works ─── */}
      <div className="mt-12">
        <SectionRule label="How payouts work" />
        <ul className="mt-5 flex flex-col gap-4">
          <InfoRow
            icon={<CreditCard size={16} strokeWidth={1.5} />}
            title="Clients pay a deposit at booking"
            body="The deposit (and any balance or tip) is charged to the client's card through your connected Stripe account."
          />
          <InfoRow
            icon={<Banknote size={16} strokeWidth={1.5} />}
            title="Stripe pays out to your bank"
            body="Payouts run automatically on Stripe's rolling schedule, typically every couple of business days once your account is verified."
          />
          <InfoRow
            icon={<ShieldCheck size={16} strokeWidth={1.5} />}
            title="Cash is always an option"
            body="You don't need Stripe to take cash bookings. Connect it only when you want to accept card deposits."
          />
        </ul>
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
          ready
            ? "border-success bg-success/10 text-success"
            : "border-ink-300 bg-cream-50 text-ink-400"
        }`}
        aria-hidden="true"
      >
        {ready ? (
          <Check size={14} strokeWidth={1.5} />
        ) : (
          <Loader2 size={14} strokeWidth={1.5} />
        )}
      </span>
      <div className="flex flex-col">
        <span className="font-sans text-sm font-medium text-ink-900">
          {label}
        </span>
        <span className="font-sans text-xs text-ink-500">{detail}</span>
      </div>
    </div>
  );
}

function InfoRow({
  icon,
  title,
  body,
}: {
  icon: React.ReactNode;
  title: string;
  body: string;
}): React.JSX.Element {
  return (
    <li className="flex items-start gap-4">
      <span
        aria-hidden="true"
        className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-rust-500"
      >
        {icon}
      </span>
      <div className="min-w-0 flex-1">
        <p className="font-sans text-base text-ink-900">{title}</p>
        <p className="mt-1 font-sans text-sm text-ink-500 leading-relaxed">
          {body}
        </p>
      </div>
    </li>
  );
}
