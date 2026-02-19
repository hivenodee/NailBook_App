"use client";

import React, { useEffect, useState, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

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

export default function ServicesPage() {
  const router = useRouter();
  const [services, setServices] = useState<Service[]>([]);
  const [providerId, setProviderId] = useState<string | null>(null);
  const [providerSlug, setProviderSlug] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Create form
  const [showCreate, setShowCreate] = useState(false);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("60");
  const [depositType, setDepositType] = useState("NONE");
  const [depositValue, setDepositValue] = useState("");
  const [creating, setCreating] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const loadServices = useCallback(async (pid: string) => {
    try {
      const res = await fetch(`/api/services?providerId=${pid}&all=true`);
      const json = await res.json();
      setServices(json.data || []);
    } catch (e) {
      console.error("Failed to load services:", e);
    }
  }, []);

  useEffect(() => {
    async function init() {
      try {
        const res = await fetch("/api/providers/me");
        const json = await res.json();
        if (json.data?.id) {
          setProviderId(json.data.id);
          setProviderSlug(json.data.slug || null);
          await loadServices(json.data.id);
        }
      } catch (e) {
        console.error("Failed to load provider:", e);
      } finally {
        setLoading(false);
      }
    }
    init();
  }, [loadServices]);

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
        setErrorMsg(json.error?.message || "Failed to create service");
        return;
      }
      // Reset form and refresh
      setName("");
      setDescription("");
      setPrice("");
      setDuration("60");
      setDepositType("NONE");
      setDepositValue("");
      setShowCreate(false);
      if (providerId) await loadServices(providerId);
    } catch (e) {
      console.error("Create failed:", e);
      setErrorMsg("Failed to create service");
    } finally {
      setCreating(false);
    }
  }

  function copyLink(serviceId: string) {
    if (!providerSlug) return;
    const url = `${window.location.origin}/${providerSlug}?service=${serviceId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(serviceId);
    setTimeout(() => setCopiedId((prev) => (prev === serviceId ? null : prev)), 2000);
  }

  async function toggleActive(service: Service) {
    try {
      await fetch(`/api/services/${service.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !service.isActive }),
      });
      if (providerId) await loadServices(providerId);
    } catch (e) {
      console.error("Toggle failed:", e);
    }
  }

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div className="flex justify-between items-center">
          <div className="h-7 bg-border/60 rounded w-24" />
          <div className="h-10 bg-border/40 rounded-button w-28" />
        </div>
        <div className="space-y-grid-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer">
              <div className="flex justify-between items-start">
                <div className="space-y-2 flex-1">
                  <div className="h-4 bg-border/60 rounded w-36" />
                  <div className="h-3 bg-border/40 rounded w-48" />
                  <div className="h-3 bg-border/40 rounded w-28" />
                </div>
                <div className="flex gap-1.5">
                  <div className="h-7 bg-border/40 rounded-button w-20" />
                  <div className="h-7 bg-border/40 rounded-button w-16" />
                </div>
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
        <h1 className="font-display text-2xl">Services</h1>
        {!showCreate && (
          <button
            onClick={() => setShowCreate(true)}
            className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors"
          >
            Add Service
          </button>
        )}
      </div>

      {/* Create form */}
      {showCreate && (
        <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
          <h2 className="text-lg font-medium">New Service</h2>

          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              maxLength={100}
              placeholder="e.g. Gel Full Set"
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Description</label>
            <input
              type="text"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={500}
              placeholder="Optional"
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>

          <div className="flex gap-grid-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Price ($)</label>
              <input
                type="number"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                min="0"
                step="0.01"
                placeholder="0.00"
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Duration (min)</label>
              <input
                type="number"
                value={duration}
                onChange={(e) => setDuration(e.target.value)}
                min="15"
                max="480"
                step="15"
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium mb-1">Deposit</label>
            <div className="flex gap-grid-1">
              {(["NONE", "FLAT", "PERCENT"] as const).map((dt) => (
                <button
                  key={dt}
                  type="button"
                  onClick={() => {
                    setDepositType(dt);
                    if (dt === "NONE") setDepositValue("");
                  }}
                  className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                    depositType === dt
                      ? "bg-primary text-white"
                      : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                  }`}
                >
                  {dt === "NONE" ? "None" : dt === "FLAT" ? "Flat $" : "Percent %"}
                </button>
              ))}
            </div>
            {depositType !== "NONE" && (
              <input
                type="number"
                value={depositValue}
                onChange={(e) => setDepositValue(e.target.value)}
                min="0"
                step={depositType === "FLAT" ? "0.01" : "1"}
                placeholder={depositType === "FLAT" ? "0.00" : "0"}
                className="mt-2 w-32 border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            )}
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <div className="flex gap-grid-1">
            <button
              onClick={handleCreate}
              disabled={creating || !name.trim() || !price}
              className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {creating ? "Creating..." : "Create Service"}
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

      {/* Services list */}
      {services.length === 0 ? (
        <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
          <p className="text-text-muted">No services yet. Add your first service.</p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {services.map((service) => (
            <div
              key={service.id}
              className={`bg-surface rounded-card p-grid-2 shadow-card ${
                !service.isActive ? "opacity-60" : ""
              }`}
            >
              <div className="flex justify-between items-start">
                <Link
                  href={`/dashboard/services/${service.id}`}
                  className="flex-1 hover:opacity-80 transition-opacity"
                >
                  <div className="flex items-center gap-2">
                    <h3 className="font-medium">{service.name}</h3>
                    {!service.isActive && (
                      <span className="text-xs font-medium bg-border/60 text-text-muted px-2 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  {service.description && (
                    <p className="text-sm text-text-muted mt-0.5">{service.description}</p>
                  )}
                  <div className="flex gap-3 mt-1 text-sm text-text-muted">
                    <span>${(service.priceInCents / 100).toFixed(2)}</span>
                    <span>{service.durationMinutes} min</span>
                    {service.depositType !== "NONE" && (
                      <span>
                        Deposit:{" "}
                        {service.depositType === "FLAT"
                          ? `$${(service.depositValue / 100).toFixed(2)}`
                          : `${service.depositValue}%`}
                      </span>
                    )}
                  </div>
                </Link>
                <div className="flex gap-1.5">
                  <button
                    onClick={() => copyLink(service.id)}
                    className="text-xs font-medium px-3 py-1.5 rounded-button transition-colors bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                  >
                    {copiedId === service.id ? "Copied!" : "Copy Link"}
                  </button>
                  <button
                    onClick={() => toggleActive(service)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                      service.isActive
                        ? "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                        : "bg-green-50 text-green-700 hover:bg-green-100"
                    }`}
                  >
                    {service.isActive ? "Disable" : "Enable"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
