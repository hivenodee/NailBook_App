"use client";

import * as React from "react";
import Link from "next/link";
import {
  Calendar as CalendarIcon,
  CalendarClock,
  Check,
  MessageSquare,
  MoreHorizontal,
  Search,
  X,
} from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Badge, type BadgeProps } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type Appointment = {
  id: string;
  status: string;
  startTime: string;
  endTime: string;
  createdAt: string;
  totalInCents: number;
  depositInCents: number;
  clientName: string | null;
  clientEmail: string | null;
  recurrenceGroupId: string | null;
  recurrenceIndex: number | null;
  service: { name: string };
  addOns: { id: string; name: string; priceInCents: number }[];
  client: { firstName: string | null; lastName: string | null };
  provider: { businessName: string; slug: string; timezone: string };
};

type Filter =
  | "ALL"
  | "UPCOMING"
  | "TODAY"
  | "THIS_WEEK"
  | "COMPLETED"
  | "CANCELLED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "UPCOMING", label: "Upcoming" },
  { value: "TODAY", label: "Today" },
  { value: "THIS_WEEK", label: "This week" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

// ─── Helpers ───────────────────────────────────────────────

function getClientFullName(a: Appointment): string {
  if (a.client?.firstName) {
    return `${a.client.firstName}${a.client.lastName ? ` ${a.client.lastName}` : ""}`;
  }
  return a.clientName || a.clientEmail || "Client";
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
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: tz,
  });
}

function startOfToday(): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function startOfTomorrow(): Date {
  const d = startOfToday();
  d.setDate(d.getDate() + 1);
  return d;
}

function startOfWeekFromTomorrow(): Date {
  // End of "this week" relative to today: 7 days after start of today.
  const d = startOfToday();
  d.setDate(d.getDate() + 7);
  return d;
}

function isCancelled(a: Appointment): boolean {
  return a.status === "CANCELLED" || a.status === "NO_SHOW";
}

function isPast(a: Appointment): boolean {
  return new Date(a.endTime).getTime() < Date.now();
}

function statusToBadge(status: string): {
  variant: BadgeProps["variant"];
  label: string;
} {
  switch (status) {
    case "CONFIRMED":
      return { variant: "verified", label: "Confirmed" };
    case "PENDING_PAYMENT":
      return { variant: "warning", label: "Pending" };
    case "COMPLETED":
      return { variant: "status", label: "Completed" };
    case "CANCELLED":
      return { variant: "error", label: "Cancelled" };
    case "NO_SHOW":
      return { variant: "error", label: "No-show" };
    default:
      return { variant: "neutral", label: status };
  }
}

// ─── Date bucketing ────────────────────────────────────────

type Bucket = {
  key: string;
  label: string;
  order: number;
};

function getBucket(a: Appointment): Bucket {
  const start = new Date(a.startTime);
  const todayStart = startOfToday();
  const tomorrowStart = startOfTomorrow();
  const thisWeekEnd = startOfWeekFromTomorrow();

  if (start >= todayStart && start < tomorrowStart) {
    return { key: "today", label: "Today", order: 0 };
  }
  const dayAfterTomorrow = new Date(tomorrowStart);
  dayAfterTomorrow.setDate(dayAfterTomorrow.getDate() + 1);
  if (start >= tomorrowStart && start < dayAfterTomorrow) {
    return { key: "tomorrow", label: "Tomorrow", order: 1 };
  }
  if (start >= dayAfterTomorrow && start < thisWeekEnd) {
    return { key: "this-week", label: "This week", order: 2 };
  }

  // Future or past — bucket per absolute date.
  const y = start.getFullYear();
  const m = String(start.getMonth() + 1).padStart(2, "0");
  const d = String(start.getDate()).padStart(2, "0");
  const key = `${y}-${m}-${d}`;

  // Future = larger order (sorted ascending by date).
  // Past   = order based on negative-time distance from today.
  const orderNumber = start.getTime() / 1000;
  return {
    key,
    label: start.toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
    }),
    order:
      start >= todayStart
        ? 3 + orderNumber / 1e10 // future buckets after the named ones, ascending
        : -orderNumber / 1e10, // past buckets at the bottom, descending
  };
}

// ─── Page ──────────────────────────────────────────────────

export default function AppointmentsPage(): React.JSX.Element {
  const [appointments, setAppointments] = React.useState<Appointment[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [query, setQuery] = React.useState("");
  const [openMenuId, setOpenMenuId] = React.useState<string | null>(null);

  React.useEffect(() => {
    async function load() {
      try {
        const res = await fetch("/api/appointments");
        const json = await res.json();
        setAppointments(json.data || []);
      } catch (e) {
        console.error("Failed to load appointments:", e);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, []);

  // Close menu on escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpenMenuId(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Filter pipeline
  const filtered = React.useMemo(() => {
    const now = Date.now();
    const todayStart = startOfToday().getTime();
    const tomorrowStart = startOfTomorrow().getTime();
    const thisWeekEnd = startOfWeekFromTomorrow().getTime();

    let list = appointments;

    // Status / time filter
    list = list.filter((a) => {
      const start = new Date(a.startTime).getTime();
      const end = new Date(a.endTime).getTime();
      switch (filter) {
        case "ALL":
          return true;
        case "UPCOMING":
          return end >= now && a.status !== "CANCELLED";
        case "TODAY":
          return start >= todayStart && start < tomorrowStart;
        case "THIS_WEEK":
          return start >= todayStart && start < thisWeekEnd;
        case "COMPLETED":
          return a.status === "COMPLETED";
        case "CANCELLED":
          return a.status === "CANCELLED" || a.status === "NO_SHOW";
        default:
          return true;
      }
    });

    // Search
    const q = query.trim().toLowerCase();
    if (q) {
      list = list.filter((a) => {
        const name = getClientFullName(a).toLowerCase();
        const service = a.service.name.toLowerCase();
        return name.includes(q) || service.includes(q);
      });
    }

    return list;
  }, [appointments, filter, query]);

  // Group + sort
  const groups = React.useMemo(() => {
    const map = new Map<string, { bucket: Bucket; items: Appointment[] }>();
    for (const a of filtered) {
      const bucket = getBucket(a);
      const existing = map.get(bucket.key);
      if (existing) existing.items.push(a);
      else map.set(bucket.key, { bucket, items: [a] });
    }
    // Sort items inside each bucket by start time ascending.
    for (const g of map.values()) {
      g.items.sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }
    return Array.from(map.values()).sort((a, b) => a.bucket.order - b.bucket.order);
  }, [filtered]);

  const isEmpty = !loading && filtered.length === 0;

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="space-y-2">
        <Heading variant="display" className="text-3xl md:text-4xl">
          Appointments
        </Heading>
        <p className="font-sans text-sm text-ink-500">
          {loading
            ? "Loading…"
            : `${filtered.length} ${filtered.length === 1 ? "appointment" : "appointments"}`}
        </p>
      </header>

      {/* ─── Filters + Search ─── */}
      <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
        <div className="-mx-1 px-1 flex gap-2 overflow-x-auto scrollbar-hide pb-1">
          {FILTERS.map((f) => (
            <FilterChip
              key={f.value}
              active={filter === f.value}
              onClick={() => setFilter(f.value)}
            >
              {f.label}
            </FilterChip>
          ))}
        </div>

        <div className="relative w-full lg:w-80 lg:shrink-0">
          <Search
            className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
            strokeWidth={1.75}
          />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or service"
            className="h-10 w-full rounded-md border border-ink-200 bg-cream-50 pl-10 pr-4 font-sans text-sm text-ink-900 placeholder:text-ink-300 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          />
        </div>
      </div>

      {/* ─── List body ─── */}
      {loading ? (
        <ListSkeleton />
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed border-ink-200">
          <EmptyState
            icon={CalendarIcon}
            title={emptyTitleFor(filter, query)}
            description={emptyDescriptionFor(filter, query)}
          />
        </div>
      ) : (
        <div className="space-y-10">
          {groups.map(({ bucket, items }) => (
            <section key={bucket.key} className="space-y-3">
              <Heading variant="h3" className="text-xl">
                {bucket.label}
              </Heading>
              <ul className="space-y-2">
                {items.map((appt) => (
                  <AppointmentRow
                    key={appt.id}
                    appointment={appt}
                    menuOpen={openMenuId === appt.id}
                    onToggleMenu={() =>
                      setOpenMenuId((id) => (id === appt.id ? null : appt.id))
                    }
                    onCloseMenu={() => setOpenMenuId(null)}
                    onActionDone={(updated) => {
                      setOpenMenuId(null);
                      // Optimistic local update if API returned the new appointment.
                      if (updated) {
                        setAppointments((prev) =>
                          prev.map((p) => (p.id === updated.id ? updated : p)),
                        );
                      } else {
                        // Refetch to be safe.
                        fetch("/api/appointments")
                          .then((r) => r.json())
                          .then((j) => setAppointments(j.data || []))
                          .catch(() => {});
                      }
                    }}
                  />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Filter chip ───────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 h-9 rounded-pill border px-4 font-sans text-sm whitespace-nowrap transition-all duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        active
          ? "bg-rust-500 text-cream-50 border-rust-500"
          : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
      )}
    >
      {children}
    </button>
  );
}

// ─── Appointment row ───────────────────────────────────────

function AppointmentRow({
  appointment,
  menuOpen,
  onToggleMenu,
  onCloseMenu,
  onActionDone,
}: {
  appointment: Appointment;
  menuOpen: boolean;
  onToggleMenu: () => void;
  onCloseMenu: () => void;
  onActionDone: (updated: Appointment | null) => void;
}): React.JSX.Element {
  const a = appointment;
  const name = getClientFullName(a);
  const tz = a.provider.timezone;
  const past = isPast(a);
  const cancelled = isCancelled(a);
  const badge = statusToBadge(a.status);

  return (
    <li
      className={cn(
        "relative",
        (past || cancelled) && "opacity-80",
      )}
    >
      <Link
        href={`/dashboard/appointments/${a.id}`}
        className="group flex items-center gap-4 rounded-md border border-ink-200 bg-cream-50 p-4 transition-all duration-200 hover:-translate-y-px hover:border-ink-300"
      >
        <Avatar
          name={name}
          size="md"
          ring={a.status === "CONFIRMED"}
        />

        <div className="min-w-0 flex-1">
          <div className="flex items-baseline gap-2">
            <p
              className={cn(
                "font-display text-base text-ink-900 truncate",
                cancelled && "line-through",
              )}
            >
              {name}
            </p>
            {a.recurrenceGroupId && (
              <span
                aria-label="Recurring"
                title="Recurring"
                className="font-display italic text-xs text-rust-500"
              >
                ↻
              </span>
            )}
          </div>
          <p className="font-sans text-sm text-ink-700 truncate">
            {a.service.name}
            {a.addOns.length > 0 && (
              <span className="text-ink-500">
                {" "}
                · {a.addOns.length} add-on{a.addOns.length !== 1 ? "s" : ""}
              </span>
            )}
          </p>
          <p className="mt-0.5 font-sans text-xs text-ink-500">
            {formatDate(a.startTime, tz)} · {formatTime(a.startTime, tz)} –{" "}
            {formatTime(a.endTime, tz)}
          </p>
        </div>

        <div className="hidden sm:flex flex-col items-end gap-1.5 shrink-0">
          <Badge variant={badge.variant}>{badge.label}</Badge>
          <p className="font-display text-sm text-ink-900">
            ${(a.totalInCents / 100).toFixed(0)}
          </p>
        </div>
      </Link>

      {/* Mobile: badge + price stack to the right of avatar inside the link is
          tight; render an extra inline strip below for narrow viewports. */}
      <div className="sm:hidden mt-2 flex items-center justify-between">
        <Badge variant={badge.variant}>{badge.label}</Badge>
        <span className="font-display text-sm text-ink-900">
          ${(a.totalInCents / 100).toFixed(0)}
        </span>
      </div>

      {/* "..." action trigger. Stops Link nav. */}
      <button
        type="button"
        aria-label="Actions"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggleMenu();
        }}
        className="absolute right-3 top-3 inline-flex h-8 w-8 items-center justify-center rounded-pill text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
      >
        <MoreHorizontal size={18} strokeWidth={1.75} />
      </button>

      {menuOpen && (
        <ActionMenu
          appointment={a}
          onClose={onCloseMenu}
          onActionDone={onActionDone}
        />
      )}
    </li>
  );
}

// ─── Action menu (popover on desktop, sheet on mobile) ────

function ActionMenu({
  appointment,
  onClose,
  onActionDone,
}: {
  appointment: Appointment;
  onClose: () => void;
  onActionDone: (updated: Appointment | null) => void;
}): React.JSX.Element {
  const [busyAction, setBusyAction] = React.useState<string | null>(null);

  async function runAction(action: "complete" | "cancel" | "no_show") {
    if (busyAction) return;
    setBusyAction(action);
    try {
      const res = await fetch(`/api/appointments/${appointment.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const json = await res.json();
      if (res.ok) {
        onActionDone(json.data ?? null);
      } else {
        alert(json.error?.message || "Couldn't complete that action.");
      }
    } catch {
      alert("Network error. Try again.");
    } finally {
      setBusyAction(null);
    }
  }

  const status = appointment.status;
  const canComplete = status === "CONFIRMED";
  const canCancel = status !== "CANCELLED" && status !== "COMPLETED";

  const items: ActionItem[] = [];
  items.push({
    type: "link",
    icon: <CalendarClock size={16} strokeWidth={1.75} />,
    label: "Reschedule",
    href: `/dashboard/appointments/${appointment.id}`,
  });
  items.push({
    type: "link",
    icon: <MessageSquare size={16} strokeWidth={1.75} />,
    label: "Message client",
    href: `/dashboard/messages`,
  });
  if (canComplete) {
    items.push({
      type: "button",
      icon: <Check size={16} strokeWidth={1.75} />,
      label: busyAction === "complete" ? "Marking…" : "Mark complete",
      onClick: () => runAction("complete"),
      disabled: !!busyAction,
    });
  }
  if (canCancel) {
    items.push({
      type: "button",
      icon: <X size={16} strokeWidth={1.75} />,
      label: busyAction === "cancel" ? "Cancelling…" : "Cancel",
      onClick: () => runAction("cancel"),
      disabled: !!busyAction,
      destructive: true,
    });
  }

  return (
    <>
      {/* Backdrop (mobile sheet only) */}
      <div
        className="fixed inset-0 z-40 bg-ink-900/40 backdrop-blur-sm md:hidden"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Mobile sheet */}
      <div className="fixed bottom-0 left-0 right-0 z-50 rounded-t-md border-t border-ink-200 bg-cream-50 px-2 py-3 shadow-elevated md:hidden">
        <div className="mx-auto mb-2 h-1 w-10 rounded-pill bg-ink-200" />
        <ActionList items={items} />
      </div>

      {/* Desktop popover anchored to the row */}
      <div className="hidden md:block absolute right-3 top-12 z-30 w-56 rounded-md border border-ink-200 bg-cream-50 p-1.5 shadow-elevated">
        <ActionList items={items} />
      </div>

      {/* Desktop click-away */}
      <div
        className="hidden md:block fixed inset-0 z-20"
        onClick={onClose}
        aria-hidden="true"
      />
    </>
  );
}

type ActionItem =
  | {
      type: "link";
      icon: React.ReactNode;
      label: string;
      href: string;
    }
  | {
      type: "button";
      icon: React.ReactNode;
      label: string;
      onClick: () => void;
      disabled?: boolean;
      destructive?: boolean;
    };

function ActionList({ items }: { items: ActionItem[] }): React.JSX.Element {
  return (
    <ul className="space-y-0.5">
      {items.map((item, i) => (
        <li key={i}>
          {item.type === "link" ? (
            <Link
              href={item.href}
              className="flex items-center gap-3 rounded-md px-3 py-2.5 font-sans text-sm text-ink-900 transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:bg-cream-100"
            >
              <span className="text-ink-500">{item.icon}</span>
              {item.label}
            </Link>
          ) : (
            <button
              type="button"
              disabled={item.disabled}
              onClick={item.onClick}
              className={cn(
                "flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-left font-sans text-sm transition-colors",
                "focus-visible:outline-none focus-visible:bg-cream-100 disabled:opacity-60 disabled:cursor-not-allowed",
                item.destructive
                  ? "text-error hover:bg-error/5"
                  : "text-ink-900 hover:bg-cream-100",
              )}
            >
              <span className={item.destructive ? "text-error" : "text-ink-500"}>
                {item.icon}
              </span>
              {item.label}
            </button>
          )}
        </li>
      ))}
    </ul>
  );
}

// ─── Empty / loading states ────────────────────────────────

function emptyTitleFor(filter: Filter, query: string): string {
  if (query.trim()) return "No matches";
  switch (filter) {
    case "TODAY":
      return "No appointments today";
    case "THIS_WEEK":
      return "Nothing scheduled this week";
    case "UPCOMING":
      return "No upcoming appointments";
    case "COMPLETED":
      return "No completed appointments yet";
    case "CANCELLED":
      return "No cancelled appointments";
    default:
      return "No appointments yet";
  }
}

function emptyDescriptionFor(filter: Filter, query: string): string {
  if (query.trim()) return "Try a different name or service.";
  switch (filter) {
    case "TODAY":
      return "Your schedule is clear for today.";
    case "THIS_WEEK":
      return "Your week is wide open. Share your booking link to start filling slots.";
    case "UPCOMING":
      return "Once clients book, their appointments will land here.";
    case "COMPLETED":
      return "Completed appointments will show up here as you finish them.";
    case "CANCELLED":
      return "Anything cancelled or no-showed will be filed here.";
    default:
      return "Once clients book, their appointments will land here.";
  }
}

function ListSkeleton(): React.JSX.Element {
  return (
    <div className="space-y-2">
      {[1, 2, 3, 4, 5].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-4 h-20 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
