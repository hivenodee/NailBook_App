"use client";

import React, { useEffect, useState, useCallback } from "react";

type ServiceOption = {
  id: string;
  name: string;
};

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

export default function CouponsPage() {
  const [coupons, setCoupons] = useState<Coupon[]>([]);
  const [services, setServices] = useState<ServiceOption[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [code, setCode] = useState("");
  const [type, setType] = useState<"PERCENT" | "FIXED">("PERCENT");
  const [value, setValue] = useState("");
  const [expiresAt, setExpiresAt] = useState("");
  const [maxUses, setMaxUses] = useState("");
  const [selectedServiceIds, setSelectedServiceIds] = useState<Set<string>>(new Set());
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadCoupons = useCallback(async () => {
    try {
      const res = await fetch("/api/coupons");
      const json = await res.json();
      setCoupons(json.data || []);
    } catch (e) {
      console.error("Failed to load coupons:", e);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/providers/me");
        const json = await res.json();
        if (json.data?.id) {
          setProviderId(json.data.id);
          // Load services for restriction picker
          const svcRes = await fetch(`/api/services?providerId=${json.data.id}&all=true`);
          const svcJson = await svcRes.json();
          setServices((svcJson.data || []).map((s: { id: string; name: string }) => ({ id: s.id, name: s.name })));
          await loadCoupons();
        }
      } catch (e) {
        console.error("Failed to init:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadCoupons]);

  async function handleCreate() {
    if (!code.trim() || !value) return;
    setCreating(true);
    setErrorMsg(null);
    try {
      const numValue = type === "FIXED"
        ? Math.round(parseFloat(value) * 100)
        : parseInt(value);
      if (!numValue || numValue <= 0) {
        setErrorMsg("Value must be greater than 0");
        return;
      }
      if (type === "PERCENT" && numValue > 100) {
        setErrorMsg("Percent cannot exceed 100");
        return;
      }
      const body: Record<string, unknown> = {
        code: code.trim(),
        type,
        value: numValue,
      };
      if (expiresAt) body.expiresAt = new Date(expiresAt).toISOString();
      if (maxUses) body.maxUses = parseInt(maxUses);
      if (selectedServiceIds.size > 0) body.serviceIds = Array.from(selectedServiceIds);

      const res = await fetch("/api/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) {
        setErrorMsg(json.error?.message || "Failed to create coupon");
        return;
      }
      // Reset form
      setCode("");
      setValue("");
      setExpiresAt("");
      setMaxUses("");
      setSelectedServiceIds(new Set());
      setShowCreate(false);
      await loadCoupons();
    } catch (e) {
      console.error("Create failed:", e);
      setErrorMsg("Failed to create coupon");
    } finally {
      setCreating(false);
    }
  }

  async function toggleActive(coupon: Coupon) {
    try {
      await fetch(`/api/coupons/${coupon.id}`, { method: "PATCH" });
      await loadCoupons();
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  }

  function toggleServiceId(id: string) {
    setSelectedServiceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function formatValue(coupon: Coupon) {
    if (coupon.type === "PERCENT") return `${coupon.value}% off`;
    return `$${(coupon.value / 100).toFixed(2)} off`;
  }

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div className="flex justify-between items-center">
          <div className="h-7 bg-border/60 rounded w-24" />
          <div className="h-10 bg-border/40 rounded-button w-32" />
        </div>
        <div className="space-y-grid-1">
          {[1, 2].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-border/60 rounded w-28" />
                  <div className="h-3 bg-border/40 rounded w-40" />
                </div>
                <div className="h-7 bg-border/40 rounded-button w-16" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-grid-3">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-2xl">Coupons</h1>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Create Coupon
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
          <h2 className="text-lg font-medium">New Coupon</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Code</label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value.toUpperCase())}
              maxLength={50}
              placeholder="e.g. SUMMER20"
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary uppercase"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Type</label>
            <div className="flex gap-grid-1">
              {(["PERCENT", "FIXED"] as const).map((t) => (
                <button
                  key={t}
                  type="button"
                  onClick={() => {
                    setType(t);
                    setValue("");
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                    type === t
                      ? "bg-primary text-white"
                      : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                  }`}
                >
                  {t === "PERCENT" ? "Percent %" : "Fixed $"}
                </button>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              {type === "PERCENT" ? "Percent off" : "Amount off ($)"}
            </label>
            <input
              type="number"
              value={value}
              onChange={(e) => setValue(e.target.value)}
              min="1"
              max={type === "PERCENT" ? "100" : undefined}
              step={type === "FIXED" ? "0.01" : "1"}
              placeholder={type === "PERCENT" ? "e.g. 20" : "e.g. 10.00"}
              className="w-32 border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Expiry <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="datetime-local"
              value={expiresAt}
              onChange={(e) => setExpiresAt(e.target.value)}
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">
              Max uses <span className="text-text-muted">(optional)</span>
            </label>
            <input
              type="number"
              value={maxUses}
              onChange={(e) => setMaxUses(e.target.value)}
              min="1"
              placeholder="Unlimited"
              className="w-32 border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          {services.length > 0 && (
            <div>
              <label className="block text-sm font-medium mb-1">
                Restrict to services <span className="text-text-muted">(optional — empty = all)</span>
              </label>
              <div className="flex flex-wrap gap-2">
                {services.map((svc) => {
                  const isSelected = selectedServiceIds.has(svc.id);
                  return (
                    <button
                      key={svc.id}
                      type="button"
                      onClick={() => toggleServiceId(svc.id)}
                      className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors border ${
                        isSelected
                          ? "border-primary bg-primary-light text-primary"
                          : "border-border bg-background text-text-secondary hover:border-primary/40"
                      }`}
                    >
                      {svc.name}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

          <div className="flex gap-grid-1">
            <button
              onClick={handleCreate}
              disabled={creating || !code.trim() || !value}
              className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Coupon"}
            </button>
            <button
              onClick={() => {
                setShowCreate(false);
                setErrorMsg(null);
              }}
              className="bg-background text-text-secondary border border-border py-2.5 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {/* Coupons list */}
      {coupons.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">No coupons yet. Create your first coupon code.</p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {coupons.map((coupon) => (
            <div
              key={coupon.id}
              className={`bg-surface rounded-card p-grid-2 shadow-card ${
                !coupon.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-semibold">{coupon.code}</span>
                    {!coupon.isActive && (
                      <span className="text-xs font-medium bg-border/60 text-text-muted px-2 py-0.5 rounded-full">
                        Disabled
                      </span>
                    )}
                  </div>
                  <div className="flex flex-wrap gap-3 mt-1 text-sm text-text-muted">
                    <span>{formatValue(coupon)}</span>
                    <span>
                      Used: {coupon.usedCount}
                      {coupon.maxUses !== null ? `/${coupon.maxUses}` : ""}
                    </span>
                    {coupon.expiresAt && (
                      <span>
                        Expires: {new Date(coupon.expiresAt).toLocaleDateString()}
                      </span>
                    )}
                  </div>
                  {coupon.services.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {coupon.services.map((s) => (
                        <span
                          key={s.id}
                          className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full"
                        >
                          {s.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
                <button
                  onClick={() => toggleActive(coupon)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                    coupon.isActive
                      ? "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                      : "bg-green-50 text-green-700 hover:bg-green-100"
                  }`}
                >
                  {coupon.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
