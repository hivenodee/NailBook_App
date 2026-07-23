"use client";

import * as React from "react";
import Link from "next/link";
import {
  Check,
  Copy,
  GripVertical,
  Plus,
  Sparkles,
  X,
} from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Heading } from "@/components/ui/Heading";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type Service = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  durationMinutes: number;
  depositType: string;
  depositValue: number;
  isActive: boolean;
  sortOrder: number;
};

// ─── Helpers ───────────────────────────────────────────────

function formatPrice(cents: number): string {
  return `$${(cents / 100).toFixed(0)}`;
}

// ─── Page ──────────────────────────────────────────────────

export default function ServicesPage(): React.JSX.Element {
  const [services, setServices] = React.useState<Service[]>([]);
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [providerSlug, setProviderSlug] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [copiedId, setCopiedId] = React.useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const loadServices = React.useCallback(async (pid: string) => {
    const res = await fetch(`/api/services?providerId=${pid}&all=true`);
    if (!res.ok) throw new Error("Server error");
    const json = await res.json();
    setServices(json.data || []);
  }, []);

  const init = React.useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const res = await fetch("/api/providers/me");
      if (!res.ok) throw new Error("Server error");
      const json = await res.json();
      if (json.data?.id) {
        setProviderId(json.data.id);
        setProviderSlug(json.data.slug || null);
        await loadServices(json.data.id);
      }
    } catch (e) {
      console.error("Failed to load services:", e);
      setLoadError("We couldn't load your services. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadServices]);

  React.useEffect(() => {
    init();
  }, [init]);

  function copyLink(serviceId: string) {
    if (!providerSlug) return;
    const url = `${window.location.origin}/${providerSlug}?service=${serviceId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(serviceId);
    setTimeout(
      () => setCopiedId((prev) => (prev === serviceId ? null : prev)),
      2000,
    );
  }

  async function toggleActive(service: Service) {
    // Optimistic flip
    setServices((prev) =>
      prev.map((s) =>
        s.id === service.id ? { ...s, isActive: !s.isActive } : s,
      ),
    );
    try {
      await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
    } catch (e) {
      console.error("Toggle failed:", e);
      // Revert on error
      if (providerId) await loadServices(providerId);
    }
  }

  const isEmpty = !loading && services.length === 0;

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-3">
          <p className="text-label text-ink-500">Services &middot; Booking menu</p>
          <Heading variant="display" className="text-3xl md:text-4xl">
            Services
          </Heading>
          <p className="font-sans text-sm text-ink-500">
            {loading ? (
              "Loading your menu"
            ) : (
              <>
                <span className="font-sans font-semibold tracking-tight text-ink-900">
                  {services.length}
                </span>{" "}
                {services.length === 1 ? "service" : "services"} on your menu
              </>
            )}
          </p>
        </div>

        {!isEmpty && (
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={() => setDrawerOpen(true)}
            className="gap-2"
          >
            <Plus size={16} strokeWidth={1.75} />
            Add service
          </Button>
        )}
      </header>

      {/* ─── Body ─── */}
      {loadError ? (
        <ErrorBanner message={loadError} onRetry={init} />
      ) : loading ? (
        <Skeleton />
      ) : isEmpty ? (
        <div className="rounded-md border border-dashed border-ink-200">
          <EmptyState
            variant="typographic"
            display="00"
            icon={Sparkles}
            title="Add your first service"
            description="Services are what clients book. Start with your most popular offering."
            action={{
              label: "Add service",
              onClick: () => setDrawerOpen(true),
            }}
          />
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {services.map((service) => (
            <ServiceCard
              key={service.id}
              service={service}
              onToggle={() => toggleActive(service)}
              onCopyLink={() => copyLink(service.id)}
              copied={copiedId === service.id}
            />
          ))}
        </div>
      )}

      {/* ─── Drawer ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <ServiceDrawer
            onClose={() => setDrawerOpen(false)}
            onCreated={async () => {
              setDrawerOpen(false);
              if (providerId) await loadServices(providerId);
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// ─── Service card ──────────────────────────────────────────

function ServiceCard({
  service,
  onToggle,
  onCopyLink,
  copied,
}: {
  service: Service;
  onToggle: () => void;
  onCopyLink: () => void;
  copied: boolean;
}): React.JSX.Element {
  return (
    <div
      className={cn(
        "group relative",
        !service.isActive && "opacity-60",
      )}
    >
      {/* Drag handle — visible on hover. Visual affordance only;
          drag-to-reorder requires API + DnD plumbing (TODO). */}
      <span
        aria-hidden="true"
        className="pointer-events-none absolute -left-2 top-1/2 -translate-y-1/2 hidden md:flex h-7 w-5 items-center justify-center rounded-sm bg-cream-50 text-ink-300 opacity-0 transition-opacity duration-150 group-hover:opacity-100"
      >
        <GripVertical size={14} strokeWidth={1.5} />
      </span>

      <Link
        href={`/dashboard/services/${service.id}`}
        className="block focus-visible:outline-none rounded-md focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
      >
        <Card padding="sm" hoverLift className="overflow-hidden">
          <div className="flex gap-4">
            {/* Photo placeholder — cream-100 square. Swap to <Image> once
                Service.photoUrl exists in the schema. */}
            <div
              aria-hidden="true"
              className="h-20 w-20 sm:h-24 sm:w-24 shrink-0 rounded-md bg-cream-100"
            />

            <div className="min-w-0 flex-1 pr-12">
              <h3 className="font-sans text-base font-medium text-ink-900 truncate">
                {service.name}
              </h3>
              <p className="mt-0.5 font-sans text-sm text-ink-500">
                {service.durationMinutes} min
                <span className="mx-1.5 text-ink-300">·</span>
                <span className="font-semibold tracking-tight text-ink-900">
                  {formatPrice(service.priceInCents)}
                </span>
                {service.depositType !== "NONE" && (
                  <>
                    <span className="mx-1.5 text-ink-300">·</span>
                    <span>
                      {service.depositType === "FLAT"
                        ? `${formatPrice(service.depositValue)} deposit`
                        : `${service.depositValue}% deposit`}
                    </span>
                  </>
                )}
              </p>
              {service.description && (
                <p className="mt-2 font-sans text-sm text-ink-700 leading-relaxed line-clamp-2">
                  {service.description}
                </p>
              )}

              {/* Inline copy-link action */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  onCopyLink();
                }}
                className="mt-1 -ml-2 -mb-1 inline-flex min-h-[44px] items-center gap-1.5 rounded-sm px-2 font-sans text-xs uppercase tracking-wide text-ink-500 hover:text-rust-500 transition-colors focus-visible:outline-none focus-visible:text-rust-500"
              >
                {copied ? (
                  <>
                    <Check size={12} strokeWidth={1.75} />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy size={12} strokeWidth={1.75} />
                    Copy booking link
                  </>
                )}
              </button>
            </div>
          </div>
        </Card>
      </Link>

      {/* Toggle — absolute, stops propagation so it doesn't navigate. */}
      <ToggleSwitch
        checked={service.isActive}
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          onToggle();
        }}
        ariaLabel={service.isActive ? "Disable service" : "Enable service"}
        className="absolute right-4 top-4"
      />
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────

function ToggleSwitch({
  checked,
  onClick,
  ariaLabel,
  className,
}: {
  checked: boolean;
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void;
  ariaLabel: string;
  className?: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 items-center rounded-pill transition-colors duration-200",
        // Invisible padding so the touch target reaches 44px without changing the visual.
        "after:absolute after:-inset-2.5 after:content-['']",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        checked ? "bg-rust-500" : "bg-cream-100 border border-ink-300",
        className,
      )}
    >
      <span
        aria-hidden="true"
        className={cn(
          "inline-block h-4 w-4 rounded-pill bg-cream-50 transition-transform duration-200",
          checked ? "translate-x-6" : "translate-x-1",
        )}
      />
    </button>
  );
}

// ─── Drawer ───────────────────────────────────────────────

function ServiceDrawer({
  onClose,
  onCreated,
}: {
  onClose: () => void;
  onCreated: () => void;
}): React.JSX.Element {
  const reduce = useReducedMotion();

  const [name, setName] = React.useState("");
  const [description, setDescription] = React.useState("");
  const [price, setPrice] = React.useState("");
  const [duration, setDuration] = React.useState("60");
  const [depositType, setDepositType] = React.useState<"NONE" | "FLAT" | "PERCENT">(
    "NONE",
  );
  const [depositValue, setDepositValue] = React.useState("");
  const [creating, setCreating] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Close on escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  // Lock body scroll while open
  React.useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, []);

  async function handleCreate() {
    if (!name.trim() || !price) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      const res = await fetch("/api/services", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || undefined,
          priceInCents: Math.round(parseFloat(price) * 100),
          durationMinutes: parseInt(duration) || 60,
          depositType,
          depositValue:
            depositType === "NONE"
              ? 0
              : depositType === "FLAT"
                ? Math.round(parseFloat(depositValue) * 100)
                : parseInt(depositValue) || 0,
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Couldn't create that service.");
        return;
      }
      onCreated();
    } catch {
      setErrorMsg("Couldn't create that service. Try again.");
    } finally {
      setCreating(false);
    }
  }

  const canSubmit = !!name.trim() && !!price && !creating;

  return (
    <div className="fixed inset-0 z-50">
      {/* Backdrop */}
      <motion.div
        className="absolute inset-0 bg-ink-900/40 backdrop-blur-sm"
        initial={reduce ? false : { opacity: 0 }}
        animate={reduce ? undefined : { opacity: 1 }}
        exit={reduce ? undefined : { opacity: 0 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Panel — full-screen on mobile, right-side drawer on md+ */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="New service"
        className="absolute inset-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-lg flex flex-col bg-cream-50 border-l border-ink-200 shadow-elevated"
        initial={
          reduce
            ? false
            : { x: typeof window !== "undefined" && window.innerWidth >= 768 ? "100%" : 0, opacity: 0 }
        }
        animate={reduce ? undefined : { x: 0, opacity: 1 }}
        exit={
          reduce
            ? undefined
            : { x: typeof window !== "undefined" && window.innerWidth >= 768 ? "100%" : 0, opacity: 0 }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        {/* Drawer header */}
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-200">
          <h2 className="font-sans text-lg font-medium text-ink-900">
            New service
          </h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink-500 hover:bg-cream-100 hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        {/* Drawer body */}
        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Input
            label="Name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
            placeholder="e.g. Gel full set"
          />
          <Input
            label="Description"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            maxLength={500}
            placeholder="What clients should know"
            helper="Optional. Up to 500 characters."
          />

          <div className="grid grid-cols-2 gap-4">
            <Input
              label="Price"
              type="number"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              min="0"
              step="0.01"
              placeholder="0.00"
            />
            <Input
              label="Duration"
              type="number"
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
              min="15"
              max="480"
              step="15"
              helper="In minutes"
            />
          </div>

          <div className="space-y-2">
            <p className="font-sans text-sm font-medium text-ink-700">Deposit</p>
            <div className="grid grid-cols-3 gap-2">
              {(
                [
                  ["NONE", "None"],
                  ["FLAT", "Flat"],
                  ["PERCENT", "Percent"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setDepositType(val);
                    if (val === "NONE") setDepositValue("");
                  }}
                  className={cn(
                    "h-10 rounded-md border font-sans text-sm transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                    depositType === val
                      ? "bg-rust-500 text-cream-50 border-rust-500"
                      : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
            {depositType !== "NONE" && (
              <Input
                type="number"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                min="0"
                step={depositType === "FLAT" ? "0.01" : "1"}
                placeholder={depositType === "FLAT" ? "0.00" : "0"}
                helper={depositType === "FLAT" ? "Dollar amount" : "Percent (1–100)"}
                className="max-w-xs"
              />
            )}
          </div>

          {errorMsg && (
            <p className="font-sans text-sm text-error" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

        {/* Drawer footer */}
        <div className="px-6 py-4 border-t border-ink-200 bg-cream-50 flex items-center justify-end gap-2">
          <Button
            type="button"
            variant="ghost"
            size="md"
            onClick={onClose}
            disabled={creating}
          >
            Cancel
          </Button>
          <Button
            type="button"
            variant="primary"
            size="md"
            onClick={handleCreate}
            disabled={!canSubmit}
          >
            {creating ? "Creating…" : "Create service"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Loading ──────────────────────────────────────────────

function Skeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-4 h-32 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
