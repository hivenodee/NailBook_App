"use client";

import * as React from "react";
import Link from "next/link";
import { useUser } from "@clerk/nextjs";
import { CalendarPlus, Plus, Share2, Star } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Heading } from "@/components/ui/Heading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { BookingsEmptyArt } from "@/components/ui/empty-art/BookingsEmptyArt";
import { PostLaunchChecklist } from "@/components/onboarding/PostLaunchChecklist";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  createdAt?: string;
  service: { name: string };
  client: { firstName: string | null; lastName: string | null };
  provider: { businessName: string; slug: string; timezone: string };
};

// ─── Helpers ───────────────────────────────────────────────

function formatTime(iso: string, tz: string): string {
  return new Date(iso).toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone: tz,
  });
}

function isToday(iso: string, tz: string): boolean {
  // Compare calendar days in the provider's timezone — otherwise a booking
  // for 11pm provider-tz could be treated as "tomorrow" by a viewer's
  // browser-local clock (or vice versa).
  // en-CA yields "YYYY-MM-DD" which can be string-compared directly.
  const day = new Date(iso).toLocaleDateString("en-CA", { timeZone: tz });
  const today = new Date().toLocaleDateString("en-CA", { timeZone: tz });
  return day === today;
}

function getGreeting(): { greeting: string; partOfDay: string } {
  const hour = new Date().getHours();
  if (hour < 12) return { greeting: "Good morning", partOfDay: "Morning" };
  if (hour < 17) return { greeting: "Good afternoon", partOfDay: "Afternoon" };
  if (hour < 21) return { greeting: "Good evening", partOfDay: "Evening" };
  return { greeting: "Good evening", partOfDay: "Late evening" };
}

function getClientDisplay(appt: Appointment): string {
  return appt.client.firstName
    ? `${appt.client.firstName} ${appt.client.lastName || ""}`.trim()
    : appt.clientName || appt.clientEmail || "Client";
}

function timeAgo(iso: string): string {
  const diffMs = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diffMs / 60000);
  if (m < 1) return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  const d = Math.floor(h / 24);
  return `${d}d ago`;
}

// ─── Page ──────────────────────────────────────────────────

export default function DashboardTodayPage(): React.JSX.Element {
  const { user } = useUser();
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);

  const load = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const [confirmedRes, pendingRes] = await Promise.all([
        fetch("/api/appointments?status=CONFIRMED"),
        fetch("/api/appointments?status=PENDING_PAYMENT"),
      ]);
      if (!confirmedRes.ok || !pendingRes.ok) {
        throw new Error("Server error");
      }
      const confirmed = await confirmedRes.json();
      const pending = await pendingRes.json();
      const all = [
        ...(confirmed.data || []),
        ...(pending.data || []),
      ].sort(
        (a: Appointment, b: Appointment) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
      const startOfToday = new Date();
      startOfToday.setHours(0, 0, 0, 0);
      const upcoming = all.filter(
        (a: Appointment) => new Date(a.startTime) >= startOfToday,
      );
      setAppointments(upcoming);
    } catch (e) {
      console.error("Failed to load appointments:", e);
      setLoadError("We couldn't load your appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  }, []);

  React.useEffect(() => {
    load();
  }, [load]);

  const todayAppointments = React.useMemo(
    () =>
      appointments.filter((a) =>
        isToday(a.startTime, a.provider.timezone),
      ),
    [appointments],
  );

  const todayRevenue = React.useMemo(
    () => todayAppointments.reduce((sum, a) => sum + a.totalInCents, 0),
    [todayAppointments],
  );

  const pendingCount = React.useMemo(
    () => appointments.filter((a) => a.status === "PENDING_PAYMENT").length,
    [appointments],
  );

  // Provider slug for the share link (first appointment's provider, since all
  // belong to the signed-in provider)
  const providerSlug = appointments[0]?.provider.slug ?? "";

  // Recent activity = newest appointments (by createdAt when present, else startTime)
  const recentActivity = React.useMemo(() => {
    return [...appointments]
      .sort((a, b) => {
        const aT = new Date(a.createdAt ?? a.startTime).getTime();
        const bT = new Date(b.createdAt ?? b.startTime).getTime();
        return bT - aT;
      })
      .slice(0, 6);
  }, [appointments]);

  const { greeting, partOfDay } = getGreeting();
  const firstName = user?.firstName ?? "";
  const headlineText = firstName ? `${greeting}, ${firstName}.` : `${greeting}.`;
  const dateLine = new Date().toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
  });

  return (
    <div className="space-y-10">
      {/* ─── Greeting ─── */}
      <header className="space-y-2">
        <Heading variant="display" className="text-4xl md:text-5xl">
          {headlineText}
        </Heading>
        <p className="font-sans text-sm text-ink-500">
          {dateLine}
          <span className="mx-2 text-ink-300">·</span>
          <span className="uppercase tracking-wide text-xs">{partOfDay}</span>
        </p>
      </header>

      <PostLaunchChecklist />

      {loadError && <ErrorBanner message={loadError} onRetry={load} />}

      {loading ? (
        <LoadingState />
      ) : loadError ? null : todayAppointments.length === 0 ? (
        <EmptyTodayState slug={providerSlug} />
      ) : (
        <>
          {/* ─── Stats ─── */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard
              eyebrow="Today's bookings"
              value={String(todayAppointments.length)}
            />
            <StatCard
              eyebrow="Today's revenue"
              value={`$${(todayRevenue / 100).toFixed(0)}`}
            />
            <StatCard
              eyebrow="Pending payment"
              value={String(pendingCount)}
              accent={pendingCount > 0}
            />
          </div>

          {/* ─── Schedule + Activity (lg only) ─── */}
          <div className="lg:grid lg:grid-cols-[1fr_320px] lg:gap-10">
            <section className="space-y-5">
              <SectionHeading>Today's schedule</SectionHeading>
              <Timeline appointments={todayAppointments} />
            </section>

            <aside className="hidden lg:block space-y-5">
              <SectionHeading>Recent activity</SectionHeading>
              <ActivityFeed items={recentActivity} />
            </aside>
          </div>

          {/* ─── Quick actions ─── */}
          <QuickActions slug={providerSlug} />
        </>
      )}
    </div>
  );
}

// ─── Local components ──────────────────────────────────────

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="flex items-center gap-3">
      <Heading variant="h3" className="text-xl">
        {children}
      </Heading>
      <span className="block h-px w-7 bg-rust-500" />
    </div>
  );
}

function StatCard({
  eyebrow,
  value,
  accent = false,
}: {
  eyebrow: string;
  value: string;
  accent?: boolean;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-ink-200 bg-cream-50 px-6 py-5">
      <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
        {eyebrow}
      </p>
      <p
        className={cn(
          "mt-3 font-display text-4xl leading-none tracking-tight",
          accent ? "text-rust-500" : "text-ink-900",
        )}
      >
        {value}
      </p>
    </div>
  );
}

function Timeline({
  appointments,
}: {
  appointments: Appointment[];
}): React.JSX.Element {
  return (
    <ol className="relative space-y-3 before:absolute before:left-[60px] before:top-2 before:bottom-2 before:w-px before:bg-ink-200">
      {appointments.map((appt) => {
        const tz = appt.provider.timezone;
        const name = getClientDisplay(appt);
        return (
          <li key={appt.id} className="flex items-start gap-4">
            {/* Time rail */}
            <div className="w-12 shrink-0 pt-3 text-right font-sans text-xs uppercase tracking-wide text-ink-500">
              {formatTime(appt.startTime, tz).replace(/ /g, "")}
            </div>
            {/* Dot on rail */}
            <span
              aria-hidden="true"
              className="relative z-10 mt-4 inline-block h-2 w-2 shrink-0 rounded-pill bg-rust-500"
            />
            {/* Card */}
            <Link
              href={`/dashboard/appointments/${appt.id}`}
              className="group flex-1 rounded-md border border-ink-200 bg-cream-50 p-4 transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
            >
              <div className="flex items-center gap-4">
                <Avatar name={name} size="md" />
                <div className="min-w-0 flex-1">
                  <p className="font-display text-base text-ink-900 truncate">
                    {name}
                  </p>
                  <p className="mt-0.5 font-sans text-sm text-ink-500 truncate">
                    {appt.service.name}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="font-display text-lg text-ink-900">
                    ${(appt.totalInCents / 100).toFixed(0)}
                  </p>
                  <p className="font-sans text-xs text-ink-500">
                    {formatTime(appt.startTime, tz)} – {formatTime(appt.endTime, tz)}
                  </p>
                </div>
              </div>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

function ActivityFeed({
  items,
}: {
  items: Appointment[];
}): React.JSX.Element {
  if (items.length === 0) {
    return (
      <p className="font-sans text-sm text-ink-500">
        Activity will show up here as bookings come in.
      </p>
    );
  }
  return (
    <ul className="space-y-3">
      {items.map((appt) => {
        const name = getClientDisplay(appt);
        const time = appt.createdAt ?? appt.startTime;
        return (
          <li key={appt.id}>
            <Link
              href={`/dashboard/appointments/${appt.id}`}
              className="flex items-start gap-3 rounded-md border border-ink-200 bg-cream-50 p-3 transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
            >
              <span
                aria-hidden="true"
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-rust-500"
              >
                <Star className="h-4 w-4" strokeWidth={1.5} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="font-sans text-sm text-ink-900 truncate">
                  New booking from {name}
                </p>
                <p className="mt-0.5 font-sans text-xs text-ink-500 truncate">
                  {appt.service.name}
                </p>
              </div>
              <span className="shrink-0 font-sans text-xs text-ink-500">
                {timeAgo(time)}
              </span>
            </Link>
          </li>
        );
      })}
    </ul>
  );
}

function QuickActions({ slug }: { slug: string }): React.JSX.Element {
  return (
    <section className="space-y-5 pt-4">
      <SectionHeading>Quick actions</SectionHeading>
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <ActionCard
          href={slug ? `/${slug}` : "/dashboard/profile"}
          icon={<Share2 className="h-5 w-5" strokeWidth={1.5} />}
          title="Share booking link"
          description="Send your link to clients."
        />
        <ActionCard
          href="/dashboard/calendar"
          icon={<Plus className="h-5 w-5" strokeWidth={1.5} />}
          title="Add appointment"
          description="Drop a manual booking on the calendar."
        />
        <ActionCard
          href="/dashboard/availability"
          icon={<CalendarPlus className="h-5 w-5" strokeWidth={1.5} />}
          title="Block off time"
          description="Mark hours unavailable."
        />
      </div>
    </section>
  );
}

function ActionCard({
  href,
  icon,
  title,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}): React.JSX.Element {
  return (
    <Link
      href={href}
      className="group flex items-start gap-4 rounded-md border border-ink-200 bg-cream-50 p-5 transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
    >
      <span
        aria-hidden="true"
        className="flex h-10 w-10 shrink-0 items-center justify-center rounded-pill bg-cream-100 text-rust-500"
      >
        {icon}
      </span>
      <div className="min-w-0">
        <p className="font-display text-base text-ink-900">{title}</p>
        <p className="mt-0.5 font-sans text-xs text-ink-500 leading-relaxed">
          {description}
        </p>
      </div>
    </Link>
  );
}

function EmptyTodayState({ slug }: { slug: string }): React.JSX.Element {
  return (
    <div className="rounded-md border border-dashed border-ink-200">
      <EmptyState
        customArt={<BookingsEmptyArt className="text-rust-500" />}
        title="Your schedule is clear today"
        description="Share your booking link to start filling slots."
        action={
          slug
            ? {
                label: "Share booking link",
                onClick: () => {
                  const url = `${window.location.origin}/${slug}`;
                  if (navigator.share) {
                    navigator
                      .share({ url, title: "Book with me on PoroBook" })
                      .catch(() => navigator.clipboard.writeText(url));
                  } else {
                    navigator.clipboard.writeText(url);
                  }
                },
              }
            : undefined
        }
      />
    </div>
  );
}

function LoadingState(): React.JSX.Element {
  return (
    <div className="space-y-10">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="rounded-md border border-ink-200 bg-cream-50 px-6 py-5 space-y-3"
          >
            <div className="h-3 w-24 skeleton-shimmer bg-cream-100 rounded" />
            <div className="h-9 w-16 skeleton-shimmer bg-cream-100 rounded" />
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="rounded-md border border-ink-200 bg-cream-50 p-4 h-20 skeleton-shimmer"
          />
        ))}
      </div>
    </div>
  );
}

