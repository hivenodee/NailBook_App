"use client";

import * as React from "react";
import { Lock } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { formatPrice } from "./helpers";
import type { ServiceData } from "./types";

export function BooksClosedView({
  service,
}: {
  service: ServiceData;
}): React.JSX.Element {
  const { booksOpenAt, timezone } = service.provider;
  const [timeLeft, setTimeLeft] = React.useState<{
    days: number;
    hours: number;
    minutes: number;
    seconds: number;
  } | null>(null);

  React.useEffect(() => {
    if (!booksOpenAt) return;
    const target = new Date(booksOpenAt).getTime();
    function update() {
      const diff = target - Date.now();
      if (diff <= 0) {
        window.location.reload();
        return;
      }
      setTimeLeft({
        days: Math.floor(diff / 86400000),
        hours: Math.floor((diff % 86400000) / 3600000),
        minutes: Math.floor((diff % 3600000) / 60000),
        seconds: Math.floor((diff % 60000) / 1000),
      });
    }
    update();
    const id = setInterval(update, 1000);
    return () => clearInterval(id);
  }, [booksOpenAt]);

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900">
      <div className="mx-auto max-w-md px-6 py-16 text-center">
        <div className="mb-10 rounded-md border border-ink-200 bg-cream-50 p-5 text-left">
          <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
            {service.provider.businessName}
          </p>
          <div className="mt-1 flex items-center justify-between">
            <p className="font-sans text-base text-ink-900">{service.name}</p>
            <p className="font-display text-lg text-ink-900">
              {formatPrice(service.priceInCents)}
            </p>
          </div>
        </div>

        <span
          aria-hidden="true"
          className="mx-auto mb-6 inline-flex h-14 w-14 items-center justify-center rounded-pill bg-cream-100"
        >
          <Lock size={20} className="text-rust-500" strokeWidth={1.5} />
        </span>

        <Heading variant="h1" className="text-3xl">
          Books are closed
        </Heading>

        {booksOpenAt && timeLeft && (
          <>
            <p className="mt-3 font-sans text-sm text-ink-500">
              Books open in
            </p>
            <div className="mt-6 flex justify-center gap-6">
              {timeLeft.days > 0 && (
                <CountTile value={String(timeLeft.days)} label="days" />
              )}
              <CountTile
                value={String(timeLeft.hours).padStart(2, "0")}
                label="hours"
              />
              <CountTile
                value={String(timeLeft.minutes).padStart(2, "0")}
                label="min"
              />
              <CountTile
                value={String(timeLeft.seconds).padStart(2, "0")}
                label="sec"
              />
            </div>
            <p className="mt-8 font-sans text-xs uppercase tracking-wide text-ink-500">
              Opens{" "}
              {new Date(booksOpenAt).toLocaleString("en-US", {
                weekday: "long",
                month: "short",
                day: "numeric",
                hour: "numeric",
                minute: "2-digit",
                timeZone: timezone,
              })}
            </p>
          </>
        )}

        {!booksOpenAt && (
          <p className="mt-3 font-sans text-base text-ink-500 leading-relaxed">
            Check back later to book your appointment.
          </p>
        )}
      </div>
    </main>
  );
}

function CountTile({
  value,
  label,
}: {
  value: string;
  label: string;
}): React.JSX.Element {
  return (
    <div className="text-center">
      <span className="font-display text-3xl tabular-nums text-ink-900">
        {value}
      </span>
      <p className="mt-1 font-sans text-xs uppercase tracking-wide text-ink-500">
        {label}
      </p>
    </div>
  );
}
