"use client";

import * as React from "react";
import { Plus, Tag, X } from "lucide-react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Badge } from "@/components/ui/Badge";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { Heading } from "@/components/ui/Heading";
import { Input } from "@/components/ui/Input";
import { cn } from "@/lib/cn";

// ─── Types ─────────────────────────────────────────────────

type ServiceOption = { id: string; name: string };

type Coupon = {
  id: string;
  code: string;
  type: "PERCENT" | "FIXED";
  value: number;
  expiresAt: string | null;
  maxUses: number | null;
  usedCount: number;
  isActive: boolean;
  services: ServiceOption[];
  createdAt: string;
};

type Filter = "ALL" | "ACTIVE" | "INACTIVE" | "EXPIRED";

const FILTERS: { value: Filter; label: string }[] = [
  { value: "ALL", label: "All" },
  { value: "ACTIVE", label: "Active" },
  { value: "INACTIVE", label: "Inactive" },
  { value: "EXPIRED", label: "Expired" },
];

// ─── Helpers ───────────────────────────────────────────────

function isExpired(c: Coupon): boolean {
  return !!c.expiresAt && new Date(c.expiresAt).getTime() < Date.now();
}

function getState(c: Coupon): "active" | "inactive" | "expired" {
  if (isExpired(c)) return "expired";
  if (!c.isActive) return "inactive";
  return "active";
}

function formatDiscount(c: Coupon): string {
  if (c.type === "PERCENT") return `${c.value}% off`;
  return `$${(c.value / 100).toFixed(2)} off`;
}

function formatExpiry(iso: string): string {
  return `Expires ${new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  })}`;
}

// ─── Page ──────────────────────────────────────────────────

export default function CouponsPage(): React.JSX.Element {
  const [coupons, setCoupons] = React.useState<Coupon[]>([]);
  const [services, setServices] = React.useState<ServiceOption[]>([]);
  const [providerId, setProviderId] = React.useState<string | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [loadError, setLoadError] = React.useState<string | null>(null);
  const [filter, setFilter] = React.useState<Filter>("ALL");
  const [drawerOpen, setDrawerOpen] = React.useState(false);

  const loadCoupons = React.useCallback(async () => {
    const res = await fetch("/api/coupons");
    if (!res.ok) throw new Error("Server error");
    const json = await res.json();
    setCoupons(json.data || []);
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
        const svcRes = await fetch(
          `/api/services?providerId=${json.data.id}&all=true`,
        );
        if (!svcRes.ok) throw new Error("Server error");
        const svcJson = await svcRes.json();
        setServices(
          (svcJson.data || []).map(
            (s: { id: string; name: string }) => ({ id: s.id, name: s.name }),
          ),
        );
        await loadCoupons();
      }
    } catch (e) {
      console.error("Failed to load coupons:", e);
      setLoadError("We couldn't load your coupons. Please try again.");
    } finally {
      setLoading(false);
    }
  }, [loadCoupons]);

  React.useEffect(() => {
    init();
  }, [init]);

  async function toggleActive(coupon: Coupon) {
    setCoupons((prev) =>
      prev.map((c) =>
        c.id === coupon.id ? { ...c, isActive: !c.isActive } : c,
      ),
    );
    try {
      await fetch(`/api/coupons/${coupon.id}`, { method: "PATCH" });
    } catch (e) {
      console.error("Toggle failed:", e);
      // Revert on error
      setCoupons((prev) =>
        prev.map((c) =>
          c.id === coupon.id ? { ...c, isActive: coupon.isActive } : c,
        ),
      );
    }
  }

  // Apply filter client-side
  const filtered = React.useMemo(() => {
    if (filter === "ALL") return coupons;
    return coupons.filter((c) => {
      const state = getState(c);
      if (filter === "ACTIVE") return state === "active";
      if (filter === "INACTIVE") return state === "inactive";
      if (filter === "EXPIRED") return state === "expired";
      return true;
    });
  }, [coupons, filter]);

  const isEmpty = !loading && coupons.length === 0;
  const totalLabel = `${coupons.length} coupon${coupons.length !== 1 ? "s" : ""}`;

  return (
    <div className="space-y-8">
      {/* ─── Header ─── */}
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="space-y-2">
          <Heading variant="display" className="text-3xl md:text-4xl">
            Coupons
          </Heading>
          <p className="font-sans text-sm text-ink-500">
            {loading ? "Loading…" : totalLabel}
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
            Create coupon
          </Button>
        )}
      </header>

      {/* ─── Filter chips ─── */}
      {!loading && coupons.length > 0 && (
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
      )}

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
            icon={Tag}
            title="Create your first coupon"
            description="Coupons help you fill slow days and reward loyal clients."
            action={{
              label: "Create coupon",
              onClick: () => setDrawerOpen(true),
            }}
          />
        </div>
      ) : filtered.length === 0 ? (
        <p className="font-sans text-sm text-ink-500">
          No coupons match this filter.
        </p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filtered.map((c) => (
            <CouponCard
              key={c.id}
              coupon={c}
              onToggle={() => toggleActive(c)}
            />
          ))}
        </div>
      )}

      {/* ─── Drawer ─── */}
      <AnimatePresence>
        {drawerOpen && (
          <CouponDrawer
            services={services}
            providerId={providerId}
            onClose={() => setDrawerOpen(false)}
            onCreated={async () => {
              setDrawerOpen(false);
              await loadCoupons();
            }}
          />
        )}
      </AnimatePresence>
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
        "shrink-0 inline-flex items-center h-9 rounded-pill border px-4 font-sans text-sm whitespace-nowrap transition-all duration-200",
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

// ─── Coupon card ───────────────────────────────────────────

function CouponCard({
  coupon,
  onToggle,
}: {
  coupon: Coupon;
  onToggle: () => void;
}): React.JSX.Element {
  const expired = isExpired(coupon);
  const state = getState(coupon);
  const dimmed = state !== "active";

  // Conditions: service restriction(s) + max uses limit.
  // Min-spend / first-time-only conditions need schema fields (not yet supported).
  const conditions: React.ReactNode[] = [];
  if (coupon.services.length > 0) {
    conditions.push(
      <span key="services" className="inline-flex flex-wrap items-center gap-1.5">
        <span>For</span>
        {coupon.services.map((s) => (
          <Badge key={s.id} variant="neutral" className="text-[10px]">
            {s.name}
          </Badge>
        ))}
      </span>,
    );
  }
  if (coupon.maxUses !== null) {
    conditions.push(
      <span key="maxUses">Up to {coupon.maxUses} redemptions</span>,
    );
  }

  return (
    <div className={cn("relative", dimmed && "opacity-70")}>
      <Card padding="lg" className="space-y-4">
        {/* Top: code + toggle */}
        <div className="flex items-start justify-between gap-3">
          <p
            className={cn(
              "font-display tracking-tight uppercase break-all leading-none",
              "text-3xl md:text-4xl",
              expired ? "text-ink-300 line-through" : "text-rust-500",
            )}
          >
            {coupon.code}
          </p>
          <ToggleSwitch
            checked={coupon.isActive}
            onClick={onToggle}
            ariaLabel={
              coupon.isActive ? "Disable coupon" : "Enable coupon"
            }
          />
        </div>

        {/* Discount */}
        <p className="font-sans text-base text-ink-900">
          {formatDiscount(coupon)}
        </p>

        {/* Conditions */}
        {conditions.length > 0 && (
          <div className="space-y-1.5">
            {conditions.map((c, i) => (
              <p key={i} className="font-sans text-sm text-ink-500">
                {c}
              </p>
            ))}
          </div>
        )}

        {/* Expiry */}
        {coupon.expiresAt && (
          <p
            className={cn(
              "font-sans text-sm",
              expired ? "text-error" : "text-ink-500",
            )}
          >
            {formatExpiry(coupon.expiresAt)}
          </p>
        )}

        {/* Bottom: redemption count */}
        <div className="pt-3 border-t border-ink-200 flex items-baseline justify-between">
          <p className="font-sans text-sm text-ink-500">
            <span className="text-ink-900">
              Used {coupon.usedCount} time{coupon.usedCount !== 1 ? "s" : ""}
            </span>
            {coupon.maxUses !== null && (
              <>
                <span className="mx-1.5 text-ink-300">·</span>
                <span>{coupon.maxUses - coupon.usedCount} left</span>
              </>
            )}
          </p>
          {state === "expired" ? (
            <Badge variant="error" className="text-[10px]">
              Expired
            </Badge>
          ) : state === "inactive" ? (
            <Badge variant="status" className="text-[10px]">
              Inactive
            </Badge>
          ) : null}
        </div>
      </Card>
    </div>
  );
}

// ─── Toggle switch ─────────────────────────────────────────

function ToggleSwitch({
  checked,
  onClick,
  ariaLabel,
}: {
  checked: boolean;
  onClick: () => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      onClick={onClick}
      className={cn(
        "relative inline-flex h-6 w-11 shrink-0 items-center rounded-pill transition-colors duration-200",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        checked ? "bg-rust-500" : "bg-cream-100 border border-ink-300",
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

// ─── Drawer ────────────────────────────────────────────────

function CouponDrawer({
  services,
  providerId: _providerId,
  onClose,
  onCreated,
}: {
  services: ServiceOption[];
  providerId: string | null;
  onClose: () => void;
  onCreated: () => void;
}): React.JSX.Element {
  const reduce = useReducedMotion();

  const [code, setCode] = React.useState("");
  const [type, setType] = React.useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = React.useState("");
  const [expiresAt, setExpiresAt] = React.useState("");
  const [maxUses, setMaxUses] = React.useState("");
  const [selectedServiceIds, setSelectedServiceIds] = React.useState<Set<string>>(
    new Set(),
  );
  const [creating, setCreating] = React.useState(false);
  const [errorMsg, setErrorMsg] = React.useState<string | null>(null);

  // Lock body scroll + close on escape
  React.useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);

  function toggleService(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  async function handleCreate() {
    if (!code.trim() || !value) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      const numValue =
        type === "FIXED"
          ? Math.round(parseFloat(value) * 100)
          : parseInt(value);
      if (!numValue || numValue <= 0) {
        setErrorMsg("Value must be greater than 0.");
        return;
      }
      if (type === "PERCENT" && numValue > 100) {
        setErrorMsg("Percent can't exceed 100.");
        return;
      }
      const body: Record<string, unknown> = {
        code: code.trim(),
        type,
        value: numValue,
      };
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
      if (maxUses) body.maxUses = parseInt(maxUses);
      if (selectedServiceIds.size > 0)
        body.serviceIds = Array.from(selectedServiceIds);

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Couldn't create that coupon.");
        return;
      }
      onCreated();
    } catch {
      setErrorMsg("Couldn't create that coupon. Try again.");
    } finally {
      setCreating(false);
    }
  }

  const canSubmit = !!code.trim() && !!value && !creating;

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

      {/* Panel */}
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-label="New coupon"
        className="absolute inset-0 md:left-auto md:right-0 md:top-0 md:bottom-0 md:w-full md:max-w-lg flex flex-col bg-cream-50 border-l border-ink-200 shadow-elevated"
        initial={
          reduce
            ? false
            : {
                x:
                  typeof window !== "undefined" && window.innerWidth >= 768
                    ? "100%"
                    : 0,
                opacity: 0,
              }
        }
        animate={reduce ? undefined : { x: 0, opacity: 1 }}
        exit={
          reduce
            ? undefined
            : {
                x:
                  typeof window !== "undefined" && window.innerWidth >= 768
                    ? "100%"
                    : 0,
                opacity: 0,
              }
        }
        transition={{ duration: 0.3, ease: "easeOut" }}
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-200">
          <Heading variant="h2" className="text-2xl">
            New coupon
          </Heading>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-9 w-9 items-center justify-center rounded-pill text-ink-500 hover:bg-cream-100 hover:text-ink-900 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
          >
            <X size={18} strokeWidth={1.75} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-6 space-y-5">
          <Input
            label="Code"
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="SUMMER25"
            maxLength={50}
            className="uppercase tracking-wide"
            helper="Stored uppercase. 1–50 characters."
          />

          <div className="space-y-2">
            <p className="font-sans text-sm font-medium text-ink-700">Type</p>
            <div className="grid grid-cols-2 gap-2">
              {(
                [
                  ["PERCENT", "Percent"],
                  ["FIXED", "Fixed amount"],
                ] as const
              ).map(([val, label]) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => {
                    setType(val);
                    setValue("");
                  }}
                  className={cn(
                    "h-10 rounded-md border font-sans text-sm transition-all duration-200",
                    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                    type === val
                      ? "bg-rust-500 text-cream-50 border-rust-500"
                      : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
                  )}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>

          <Input
            label={type === "PERCENT" ? "Percent off" : "Amount off"}
            type="number"
            value={value}
            onChange={(e) => setValue(e.target.value)}
            min="1"
            max={type === "PERCENT" ? "100" : undefined}
            step={type === "FIXED" ? "0.01" : "1"}
            placeholder={type === "PERCENT" ? "20" : "10.00"}
            helper={type === "PERCENT" ? "1–100" : "Dollar amount"}
            className="max-w-xs"
          />

          <Input
            label="Expiry"
            type="datetime-local"
            value={expiresAt}
            onChange={(e) => setExpiresAt(e.target.value)}
            helper="Optional. Leave blank for no expiry."
          />

          <Input
            label="Max uses"
            type="number"
            value={maxUses}
            onChange={(e) => setMaxUses(e.target.value)}
            min="1"
            placeholder="Unlimited"
            helper="Optional. Cap total redemptions."
            className="max-w-xs"
          />

          {services.length > 0 && (
            <div className="space-y-2">
              <p className="font-sans text-sm font-medium text-ink-700">
                Restrict to services
              </p>
              <p className="font-sans text-xs text-ink-500">
                Optional. Leave empty to apply to all services.
              </p>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => {
                  const selected = selectedServiceIds.has(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleService(svc.id)}
                      className={cn(
                        "shrink-0 inline-flex items-center h-9 rounded-pill border px-3.5 font-sans text-sm transition-all duration-200",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                        selected
                          ? "bg-rust-500 text-cream-50 border-rust-500"
                          : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
                      )}
                    >
                      {svc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && (
            <p className="font-sans text-sm text-error" role="alert">
              {errorMsg}
            </p>
          )}
        </div>

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
            {creating ? "Creating…" : "Create coupon"}
          </Button>
        </div>
      </motion.div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────

function Skeleton(): React.JSX.Element {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
      {[1, 2, 3, 4].map((i) => (
        <div
          key={i}
          className="rounded-md border border-ink-200 bg-cream-50 p-6 h-48 skeleton-shimmer"
        />
      ))}
    </div>
  );
}
