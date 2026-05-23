"use client";

import * as React from "react";
import Link from "next/link";
import { ArrowRight, Mail, Search, Users } from "lucide-react";
import { Avatar } from "@/components/ui/Avatar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Heading } from "@/components/ui/Heading";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type ClientRow = {
  id: string;
  name: string | null;
  email: string;
  phone: string | null;
  notes: string | null;
  appointmentCount: number;
  lastAppointmentDate: string | null;
  firstAppointmentDate: string | null;
  lifetimeSpendInCents: number;
  createdAt: string;
};

type Filter = "ALL" | "NEW" | "REGULARS" | "INACTIVE";
type Sort =
  | "RECENT"
  | "MOST_VISITS"
  | "HIGHEST_SPEND"
  | "ALPHA";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "NEW", label: "New" },
  { value: "REGULARS", label: "Regulars" },
  { value: "INACTIVE", label: "Inactive" },
];

const SORTS: { value: Sort; label: string }[] = [
  { value: "RECENT", label: "Recently visited" },
  { value: "MOST_VISITS", label: "Most visits" },
  { value: "HIGHEST_SPEND", label: "Highest spend" },
  { value: "ALPHA", label: "A → Z" },
];

const DAY = 86_400_000;

// ─── Helpers ───────────────────────────────────────────────

function displayName(c: ClientRow): string {
  return c.name?.trim() || c.email || "Client";
}

function formatLastVisit(iso: string | null): string {
  if (!iso) return "No visits yet";
  const days = Math.floor((Date.now() - new Date(iso).getTime()) / DAY);
  if (days < 0) return "Upcoming";
  if (days === 0) return "Today";
  if (days === 1) return "Yesterday";
  if (days < 7) return `${days} days ago`;
  if (days < 30) return `${Math.floor(days / 7)}w ago`;
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
}

function formatPrice(cents: number): string {
  if (cents === 0) return "$0";
  if (cents >= 100_000) return `$${Math.round(cents / 100_000)}k`;
  return `$${(cents / 100).toFixed(0)}`;
}

function isNewClient(c: ClientRow): boolean {
  // First visit (or record creation when no visit yet) within the last 30 days.
  const reference = c.firstAppointmentDate ?? c.createdAt;
  if (!reference) return false;
  return Date.now() - new Date(reference).getTime() < 30 * DAY;
}

function isRegular(c: ClientRow): boolean {
  return c.appointmentCount >= 3;
}

function isInactive(c: ClientRow): boolean {
  if (!c.lastAppointmentDate) return c.appointmentCount === 0;
  return Date.now() - new Date(c.lastAppointmentDate).getTime() > 90 * DAY;
}

// ─── Page ──────────────────────────────────────────────────

export default function ClientsPage(): React.JSX.Element {
  const [clients, setClients] = React.useState<ClientRow[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [search, setSearch] = React.useState("");
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [sort, setSort] = React.useState<Sort>("RECENT");

  const load = React.useCallback(() => {
    setLoading(true);
    setLoadError(null);
    const params = search.trim()
      ? `?search=${encodeURIComponent(search.trim())}`
      : "";
    fetch(`/api/clients${params}`)
      .then((r) => {
        if (!r.ok) throw new Error("Server error");
        return r.json();
      })
      .then((json) => {
        if (json.data) setClients(json.data);
      })
      .catch((e) => {
        console.error("Failed to load clients:", e);
        setLoadError("We couldn't load your clients. Please try again.");
      })
      .finally(() => setLoading(false));
  }, [search]);

  React.useEffect(() => {
    load();
  }, [load]);

  const filtered = React.useMemo(() => {
    let list = clients;
    if (filter === "NEW") list = list.filter(isNewClient);
    else if (filter === "REGULARS") list = list.filter(isRegular);
    else if (filter === "INACTIVE") list = list.filter(isInactive);
    return list;
  }, [clients, filter]);

  const sorted = React.useMemo(() => {
    const list = [...filtered];
    switch (sort) {
      case "MOST_VISITS":
        list.sort((a, b) => b.appointmentCount - a.appointmentCount);
        break;
      case "HIGHEST_SPEND":
        list.sort((a, b) => b.lifetimeSpendInCents - a.lifetimeSpendInCents);
        break;
      case "ALPHA":
        list.sort((a, b) =>
          displayName(a).localeCompare(displayName(b), undefined, {
            sensitivity: "base",
          }),
        );
        break;
      case "RECENT":
      default:
        list.sort((a, b) => {
          const at = a.lastAppointmentDate
            ? new Date(a.lastAppointmentDate).getTime()
            : 0;
          const bt = b.lastAppointmentDate
            ? new Date(b.lastAppointmentDate).getTime()
            : 0;
          return bt - at;
        });
    }
    return list;
  }, [filtered, sort]);

  const isEmpty = !loading && sorted.length === 0;
  const totalLabel = `${clients.length} total client${clients.length !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="space-y-2">
        <Heading variant="display" className="text-3xl md:text-4xl">
          Clients
        </Heading>
        <p className="font-sans text-sm text-ink-500">
          {loading ? "Loading…" : totalLabel}
        </p>
      </header>

      {/* ─── Search ─── */}
      <div className="relative">
        <Search
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, email, or phone"
          className="h-11 w-full rounded-md border border-ink-200 bg-cream-50 pl-11 pr-4 font-sans text-base text-ink-900 placeholder:text-ink-300 transition-colors duration-200 hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
        />
      </div>

      {/* ─── Filters + Sort ─── */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
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

        <SortSelect value={sort} onChange={setSort} />
      </div>

      {/* ─── Body ─── */}
      {loadError ? (
        <ErrorBanner message={loadError} onRetry={load} />
      ) : loading ? (
        <Skeleton />
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed border-ink-200">
          <EmptyState
            icon={Users}
            title={emptyTitle(search, filter)}
            description={emptyDescription(search, filter)}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {sorted.map((c) => (
            <ClientCard key={c.id} client={c} />
          ))}
        </div>
      )}
    </div>
  );
}

// ─── Components ────────────────────────────────────────────

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

function SortSelect({
  value,
  onChange,
}: {
  value: Sort;
  onChange: (v: Sort) => void;
}): React.JSX.Element {
  return (
    <label className="inline-flex items-center gap-2 shrink-0">
      <span className="font-sans text-xs uppercase tracking-wide text-ink-500">
        Sort
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value as Sort)}
        className="h-9 rounded-md border border-ink-200 bg-cream-50 pl-3 pr-8 font-sans text-sm text-ink-900 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
      >
        {SORTS.map((s) => (
          <option key={s.value} value={s.value}>
            {s.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function ClientCard({ client }: { client: ClientRow }): React.JSX.Element {
  const name = displayName(client);
  const isReg = isRegular(client);
  const visitsLabel = client.appointmentCount === 1 ? "visit" : "visits";

  return (
    <Link
      href={`/dashboard/clients/${client.id}`}
      className="group block focus-visible:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
    >
      <Card padding="md" hoverLift className="flex flex-col items-center text-center">
        <Avatar name={name} size="lg" ring={isReg} />

        <p className="mt-4 font-display text-base text-ink-900 truncate max-w-full">
          {name}
        </p>
        <p className="mt-0.5 font-sans text-sm text-ink-500">
          {formatLastVisit(client.lastAppointmentDate)}
        </p>

        <p className="mt-3 font-sans text-sm text-ink-700">
          <span className="text-ink-900">{client.appointmentCount}</span>{" "}
          <span className="text-ink-500">{visitsLabel}</span>
          <span className="mx-2 text-ink-300">·</span>
          <span className="text-ink-900">
            {formatPrice(client.lifetimeSpendInCents)}
          </span>
          <span className="text-ink-500"> lifetime</span>
        </p>

        {/* Action row */}
        <div className="mt-5 pt-4 w-full border-t border-ink-200 flex items-center justify-between">
          <a
            href={`mailto:${client.email}`}
            onClick={(e) => e.stopPropagation()}
            aria-label={`Email ${name}`}
            className="inline-flex h-8 w-8 items-center justify-center rounded-pill text-ink-500 transition-colors hover:bg-cream-100 hover:text-ink-900 focus-visible:outline-none focus-visible:bg-cream-100"
          >
            <Mail size={16} strokeWidth={1.75} />
          </a>
          <span className="inline-flex items-center gap-1 font-sans text-xs uppercase tracking-wide text-ink-500 group-hover:text-rust-500 transition-colors">
            View profile
            <ArrowRight
              size={12}
              strokeWidth={1.75}
              className="transition-transform group-hover:translate-x-0.5"
            />
          </span>
        </div>
      </Card>
    </Link>
  );
}

// ─── Empty / loading copy ─────────────────────────────────

function emptyTitle(search: string, filter: Filter): string {
  if (search.trim()) return "No matches";
  switch (filter) {
    case "NEW":
      return "No new clients";
    case "REGULARS":
      return "No regulars yet";
    case "INACTIVE":
      return "No inactive clients";
    default:
      return "No clients yet";
  }
}

function emptyDescription(search: string, filter: Filter): string {
  if (search.trim()) return "Try a different name, email, or phone.";
  switch (filter) {
    case "NEW":
      return "Anyone whose first visit was within the last 30 days will land here.";
    case "REGULARS":
      return "Clients with three or more visits show up here once they're booking again.";
    case "INACTIVE":
      return "Clients who haven't visited in 90 days will surface here. Reach out to bring them back.";
    default:
      return "Clients you book will automatically appear here. Share your booking link to get started.";
  }
}

function Skeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {[1, 2, 3, 4, 5, 6].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-6 h-56 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
