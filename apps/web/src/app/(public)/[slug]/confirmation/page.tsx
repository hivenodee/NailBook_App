"use client";

import * as React from "react";
import Link from "next/link";
import { useParams, useSearchParams } from "next/navigation";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

type AppointmentData = {
  id: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  status: string;
  service: { name: string; durationMinutes: number };
  provider: { businessName: string; slug: string; timezone: string };
};

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(2)}`;
}

function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function formatDate(iso: string, tz: string): string {
  return new Date(iso).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: tz,
  });
}

function toCalendarDate(iso: string): string {
  return new Date(iso)
    .toISOString()
    .replace(/[-:]/g, "")
    .replace(/\.\d{3}/, "");
}

function buildGoogleCalendarUrl(appt: AppointmentData): string {
  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: `${appt.service.name} — ${appt.provider.businessName}`,
    dates: `${toCalendarDate(appt.startTime)}/${toCalendarDate(appt.endTime)}`,
    details: `Booked via PoroBook\nService: ${appt.service.name}\nDuration: ${appt.service.durationMinutes} min`,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

const fadeUp: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

const stagger: Variants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.08 } },
};

export default function ConfirmationPage(): React.JSX.Element {
  const searchParams = useSearchParams();
  const params = useParams();
  const slug = params.slug as string;
  const appointmentId = searchParams.get("appointment");

  const [appt, setAppt] = React.useState<AppointmentData | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [timedOut, setTimedOut] = React.useState(false);
  const pollCount = React.useRef(0);
  const reduce = useReducedMotion();

  const fetchAppointment = React.useCallback(async () => {
    if (!appointmentId) return null;
    const res = await fetch(`/api/appointments/${appointmentId}`);
    const json = await res.json();
    return json.data as AppointmentData | null;
  }, [appointmentId]);

  React.useEffect(() => {
    if (!appointmentId) {
      setLoading(false);
      return;
    }
    fetchAppointment()
      .then((data) => {
        if (data) setAppt(data);
      })
      .finally(() => setLoading(false));
  }, [appointmentId, fetchAppointment]);

  // Poll while pending payment, max ~60s.
  React.useEffect(() => {
    if (!appt || appt.status !== "PENDING_PAYMENT") return;
    const interval = setInterval(async () => {
      pollCount.current += 1;
      if (pollCount.current >= 20) {
        clearInterval(interval);
        setTimedOut(true);
        return;
      }
      const data = await fetchAppointment();
      if (data) {
        setAppt(data);
        if (data.status !== "PENDING_PAYMENT") clearInterval(interval);
      }
    }, 3000);
    return () => clearInterval(interval);
  }, [appt?.status, fetchAppointment]);

  const isPending = appt?.status === "PENDING_PAYMENT" && !timedOut;
  const isConfirmed =
    appt?.status === "CONFIRMED" || appt?.status === "COMPLETED";
  const isFailed = timedOut || (appt && !isPending && !isConfirmed);

  return (
    <main className="flex min-h-screen items-center justify-center bg-cream-50 text-ink-900 px-6 py-16">
      <motion.div
        className="w-full max-w-md text-center"
        initial={reduce ? false : "hidden"}
        animate="visible"
        variants={stagger}
      >
        {/* Eyebrow status indicator */}
        <motion.p
          variants={fadeUp}
          className="font-display italic text-sm text-ink-500 mb-6"
        >
          {isPending && "Processing"}
          {isConfirmed && "Confirmed"}
          {isFailed && "Something went wrong"}
          {loading && !appt && "Loading"}
        </motion.p>

        {/* Headline */}
        <motion.div variants={fadeUp}>
          {isPending && (
            <Heading variant="display" className="text-4xl md:text-5xl">
              Hang tight.
            </Heading>
          )}
          {isConfirmed && (
            <Heading variant="display" className="text-4xl md:text-5xl">
              You're booked.
            </Heading>
          )}
          {isFailed && (
            <Heading variant="display" className="text-4xl md:text-5xl">
              Payment didn't go through.
            </Heading>
          )}
          {loading && !appt && (
            <Heading variant="display" className="text-4xl md:text-5xl">
              One moment.
            </Heading>
          )}
        </motion.div>

        {/* Supporting line */}
        <motion.p
          variants={fadeUp}
          className="mt-5 mx-auto max-w-sm font-sans text-base text-ink-500 leading-relaxed"
        >
          {isPending &&
            "Waiting on payment confirmation. This usually takes a few seconds."}
          {isConfirmed &&
            "A confirmation is on its way to your email. Your provider sees your appointment now."}
          {isFailed &&
            "We didn't receive a payment confirmation. You can try again or get in touch with the provider."}
          {loading && !appt && "Checking on your booking."}
        </motion.p>

        {/* Appointment details — only when we have data */}
        {appt && (
          <motion.div
            variants={fadeUp}
            className="mt-12 rounded-md border border-ink-200 bg-cream-50 p-6 text-left space-y-2.5"
          >
            <DetailRow label="Service" value={appt.service.name} />
            <DetailRow label="Provider" value={appt.provider.businessName} />
            <DetailRow
              label="Date"
              value={formatDate(appt.startTime, appt.provider.timezone)}
            />
            <DetailRow
              label="Time"
              value={formatTime(appt.startTime, appt.provider.timezone)}
            />
            <DetailRow
              label="Duration"
              value={`${appt.service.durationMinutes} min`}
            />
            <hr className="border-ink-200" />
            <DetailRow
              label="Total"
              value={formatPrice(appt.totalInCents)}
              emphasize
            />
            {appt.depositInCents > 0 && (
              <DetailRow
                label="Paid today"
                value={formatPrice(appt.depositInCents)}
                accent
              />
            )}
          </motion.div>
        )}

        {/* CTA */}
        <motion.div variants={fadeUp} className="mt-10 space-y-4">
          {isConfirmed && appt && (
            <Link href={buildGoogleCalendarUrl(appt)} target="_blank" rel="noopener noreferrer" className="block">
              <Button variant="primary" size="lg" className="w-full">
                Add to calendar
              </Button>
            </Link>
          )}

          {isFailed && appt && (
            <Link href={`/${slug}/book?service=${appt.id}`} className="block">
              <Button variant="primary" size="lg" className="w-full">
                Try again
              </Button>
            </Link>
          )}

          {isPending && (
            <Button
              type="button"
              variant="primary"
              size="lg"
              disabled
              className="w-full"
            >
              Waiting for confirmation…
            </Button>
          )}

          <Link
            href={`/${slug}`}
            className="inline-block font-sans text-sm text-ink-500 hover:text-ink-900 transition-colors underline-offset-4 hover:underline"
          >
            Back to {appt?.provider.businessName ?? "provider"}
          </Link>
        </motion.div>
      </motion.div>
    </main>
  );
}

function DetailRow({
  label,
  value,
  emphasize = false,
  accent = false,
}: {
  label: string;
  value: string;
  emphasize?: boolean;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-4">
      <span className="font-sans text-sm text-ink-500">{label}</span>
      <span
        className={
          emphasize
            ? "font-display text-base text-ink-900"
            : accent
              ? "font-sans text-sm text-rust-500"
              : "font-sans text-sm text-ink-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
