"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AddOn = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  isActive: boolean;
};

type ServiceData = {
  id: string;
  name: string;
  description: string | null;
  priceInCents: number;
  durationMinutes: number;
  depositType: string;
  depositValue: number;
  isActive: boolean;
  addOns: AddOn[];
};

export default function EditServicePage() {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Form state
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [duration, setDuration] = useState("");
  const [depositType, setDepositType] = useState("NONE");
  const [depositValue, setDepositValue] = useState("");

  // Add-on create form
  const [showAddOn, setShowAddOn] = useState(false);
  const [addonName, setAddonName] = useState("");
  const [addonPrice, setAddonPrice] = useState("");
  const [addonDuration, setAddonDuration] = useState("0");
  const [creatingAddon, setCreatingAddon] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/${id}?all=true`);
      const json = await res.json();
      if (json.data) {
        const s = json.data as ServiceData;
        setService(s);
        setName(s.name);
        setDescription(s.description || "");
        setPrice((s.priceInCents / 100).toFixed(2));
        setDuration(String(s.durationMinutes));
        setDepositType(s.depositType);
        setDepositValue(
          s.depositType === "FLAT"
            ? (s.depositValue / 100).toFixed(2)
            : String(s.depositValue)
        );
      }
    } catch (e) {
      console.error("Failed to load service:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  async function handleSave() {
    setSaving(true);
    setSaved(false);
    setErrorMsg(null);
    try {
      const res = await fetch(`/api/services/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          description: description.trim() || null,
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
        setErrorMsg(json.error?.message || "Save failed");
        return;
      }
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch (e) {
      console.error("Save failed:", e);
      setErrorMsg("Save failed");
    } finally {
      setSaving(false);
    }
  }

  async function handleCreateAddon() {
    if (!addonName.trim() || !addonPrice) return;
    setCreatingAddon(true);
    try {
      const res = await fetch(`/api/services/${id}/addons`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: addonName.trim(),
          priceInCents: Math.round(parseFloat(addonPrice) * 100),
          durationMinutes: parseInt(addonDuration) || 0,
        }),
      });
      if (res.ok) {
        setAddonName("");
        setAddonPrice("");
        setAddonDuration("0");
        setShowAddOn(false);
        await load();
      }
    } catch (e) {
      console.error("Create addon failed:", e);
    } finally {
      setCreatingAddon(false);
    }
  }

  async function toggleAddonActive(addon: AddOn) {
    try {
      await fetch(`/api/services/${id}/addons/${addon.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: !addon.isActive }),
      });
      await load();
    } catch (e) {
      console.error("Toggle addon failed:", e);
    }
  }

  if (loading) {
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  if (!service) {
    return (
      <div className="space-y-grid-2">
        <p className="text-text-muted">Service not found.</p>
        <Link href="/dashboard/services" className="text-primary text-sm hover:underline">
          Back to services
        </Link>
      </div>
    );
  }

  return (
    <div className="space-y-grid-3 max-w-lg">
      <Link href="/dashboard/services" className="text-sm text-text-muted hover:text-text-secondary">
        &larr; Back to services
      </Link>

      <h1 className="text-2xl font-semibold">Edit Service</h1>

      {/* Service fields */}
      <section className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
        <div>
          <label className="block text-sm font-medium mb-1">Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            maxLength={100}
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
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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

        <div className="flex items-center gap-grid-2">
          <button
            onClick={handleSave}
            disabled={saving || !name.trim() || !price}
            className="bg-primary text-white py-3 px-6 rounded-button font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {saving ? "Saving..." : "Save"}
          </button>
          {saved && (
            <span className="text-sm text-green-600 font-medium">Saved</span>
          )}
          {errorMsg && (
            <span className="text-sm text-red-600 font-medium">{errorMsg}</span>
          )}
        </div>
      </section>

      {/* Add-ons */}
      <section className="space-y-grid-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Add-ons</h2>
          {!showAddOn && (
            <button
              onClick={() => setShowAddOn(true)}
              className="text-sm font-medium text-primary hover:underline"
            >
              Add
            </button>
          )}
        </div>

        {/* Create add-on form */}
        {showAddOn && (
          <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
            <div>
              <label className="block text-sm font-medium mb-1">Name</label>
              <input
                type="text"
                value={addonName}
                onChange={(e) => setAddonName(e.target.value)}
                maxLength={100}
                placeholder="e.g. Nail Art"
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex gap-grid-2">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Price ($)</label>
                <input
                  type="number"
                  value={addonPrice}
                  onChange={(e) => setAddonPrice(e.target.value)}
                  min="0"
                  step="0.01"
                  placeholder="0.00"
                  className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1">Extra time (min)</label>
                <input
                  type="number"
                  value={addonDuration}
                  onChange={(e) => setAddonDuration(e.target.value)}
                  min="0"
                  max="120"
                  step="5"
                  className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
            </div>
            <div className="flex gap-grid-1">
              <button
                onClick={handleCreateAddon}
                disabled={creatingAddon || !addonName.trim() || !addonPrice}
                className="bg-primary text-white py-2 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {creatingAddon ? "Adding..." : "Add"}
              </button>
              <button
                onClick={() => setShowAddOn(false)}
                className="bg-gray-100 text-gray-700 py-2 px-4 rounded-button text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Add-ons list */}
        {service.addOns.length === 0 && !showAddOn ? (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
            <p className="text-text-muted text-sm">No add-ons yet.</p>
          </div>
        ) : (
          <div className="space-y-grid-1">
            {service.addOns.map((addon) => (
              <div
                key={addon.id}
                className={`bg-surface rounded-card p-grid-2 shadow-card flex justify-between items-center ${
                  !addon.isActive ? "opacity-60" : ""
                }`}
              >
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-medium">{addon.name}</span>
                    {!addon.isActive && (
                      <span className="text-xs bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded-full">
                        Inactive
                      </span>
                    )}
                  </div>
                  <div className="flex gap-3 text-xs text-text-muted mt-0.5">
                    <span>+${(addon.priceInCents / 100).toFixed(2)}</span>
                    {addon.durationMinutes > 0 && (
                      <span>+{addon.durationMinutes} min</span>
                    )}
                  </div>
                </div>
                <button
                  onClick={() => toggleAddonActive(addon)}
                  className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                    addon.isActive
                      ? "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      : "bg-green-100 text-green-800 hover:bg-green-200"
                  }`}
                >
                  {addon.isActive ? "Disable" : "Enable"}
                </button>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
