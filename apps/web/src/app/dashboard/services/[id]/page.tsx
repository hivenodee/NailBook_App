"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";

type AddOnGroup = {
  id: string;
  name: string;
  sortOrder: number;
  rule: "OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE";
};

type AddOn = {
  id: string;
  name: string;
  priceInCents: number;
  durationMinutes: number;
  isActive: boolean;
  groupId: string | null;
  isMandatory: boolean;
  sortOrder: number;
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
  addOnGroups: AddOnGroup[];
};

const RULE_LABELS: Record<string, string> = {
  OPTIONAL: "Optional",
  EXACTLY_ONE: "Exactly One",
  AT_LEAST_ONE: "At Least One",
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
  const [addonGroupId, setAddonGroupId] = useState("");
  const [addonMandatory, setAddonMandatory] = useState(false);
  const [creatingAddon, setCreatingAddon] = useState(false);

  // Add-on edit form
  const [editingAddonId, setEditingAddonId] = useState<string | null>(null);
  const [editAddonName, setEditAddonName] = useState("");
  const [editAddonPrice, setEditAddonPrice] = useState("");
  const [editAddonDuration, setEditAddonDuration] = useState("0");
  const [editAddonGroupId, setEditAddonGroupId] = useState("");
  const [editAddonMandatory, setEditAddonMandatory] = useState(false);
  const [savingAddon, setSavingAddon] = useState(false);

  // Group create/edit form
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupRule, setGroupRule] = useState<"OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE">("OPTIONAL");
  const [savingGroup, setSavingGroup] = useState(false);

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
          groupId: addonGroupId || undefined,
          isMandatory: addonMandatory,
        }),
      });
      if (res.ok) {
        setAddonName("");
        setAddonPrice("");
        setAddonDuration("0");
        setAddonGroupId("");
        setAddonMandatory(false);
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

  // Add-on edit
  function openAddonEdit(addon: AddOn) {
    setEditingAddonId(addon.id);
    setEditAddonName(addon.name);
    setEditAddonPrice((addon.priceInCents / 100).toFixed(2));
    setEditAddonDuration(String(addon.durationMinutes));
    setEditAddonGroupId(addon.groupId || "");
    setEditAddonMandatory(addon.isMandatory);
  }

  function closeAddonEdit() {
    setEditingAddonId(null);
  }

  async function handleSaveAddon() {
    if (!editingAddonId || !editAddonName.trim() || !editAddonPrice) return;
    setSavingAddon(true);
    try {
      await fetch(`/api/services/${id}/addons/${editingAddonId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editAddonName.trim(),
          priceInCents: Math.round(parseFloat(editAddonPrice) * 100),
          durationMinutes: parseInt(editAddonDuration) || 0,
          groupId: editAddonGroupId || null,
          isMandatory: editAddonMandatory,
        }),
      });
      setEditingAddonId(null);
      await load();
    } catch (e) {
      console.error("Save addon failed:", e);
    } finally {
      setSavingAddon(false);
    }
  }

  // Group CRUD
  function openGroupForm(group?: AddOnGroup) {
    if (group) {
      setEditingGroupId(group.id);
      setGroupName(group.name);
      setGroupRule(group.rule);
    } else {
      setEditingGroupId(null);
      setGroupName("");
      setGroupRule("OPTIONAL");
    }
    setShowGroupForm(true);
  }

  async function handleSaveGroup() {
    if (!groupName.trim()) return;
    setSavingGroup(true);
    try {
      if (editingGroupId) {
        await fetch(`/api/services/${id}/addon-groups/${editingGroupId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName.trim(), rule: groupRule }),
        });
      } else {
        await fetch(`/api/services/${id}/addon-groups`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name: groupName.trim(), rule: groupRule }),
        });
      }
      setShowGroupForm(false);
      setEditingGroupId(null);
      setGroupName("");
      setGroupRule("OPTIONAL");
      await load();
    } catch (e) {
      console.error("Save group failed:", e);
    } finally {
      setSavingGroup(false);
    }
  }

  async function handleDeleteGroup(groupId: string) {
    try {
      await fetch(`/api/services/${id}/addon-groups/${groupId}`, {
        method: "DELETE",
      });
      await load();
    } catch (e) {
      console.error("Delete group failed:", e);
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

  // Group add-ons by group, ungrouped at the end
  const groups = (service.addOnGroups || [])
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      ...g,
      addOns: service.addOns.filter((a) => a.groupId === g.id).sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  const ungrouped = service.addOns.filter((a) => !a.groupId).sort((a, b) => a.sortOrder - b.sortOrder);

  function renderAddonCard(addon: AddOn) {
    if (editingAddonId === addon.id) {
      return (
        <div key={addon.id} className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1 border border-primary/30">
          <p className="text-sm font-medium">Edit Add-on</p>
          <div>
            <label className="block text-sm font-medium mb-1">Name</label>
            <input
              type="text"
              value={editAddonName}
              onChange={(e) => setEditAddonName(e.target.value)}
              maxLength={100}
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            />
          </div>
          <div className="flex gap-grid-2">
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Price ($)</label>
              <input
                type="number"
                value={editAddonPrice}
                onChange={(e) => setEditAddonPrice(e.target.value)}
                min="0"
                step="0.01"
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-medium mb-1">Extra time (min)</label>
              <input
                type="number"
                value={editAddonDuration}
                onChange={(e) => setEditAddonDuration(e.target.value)}
                min="0"
                max="120"
                step="5"
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium mb-1">Group</label>
            <select
              value={editAddonGroupId}
              onChange={(e) => setEditAddonGroupId(e.target.value)}
              className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">No group</option>
              {(service!.addOnGroups || []).map((g) => (
                <option key={g.id} value={g.id}>{g.name}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={editAddonMandatory}
              onChange={(e) => setEditAddonMandatory(e.target.checked)}
              className="rounded border-border"
            />
            Mandatory (always included)
          </label>
          <div className="flex gap-grid-1">
            <button
              onClick={handleSaveAddon}
              disabled={savingAddon || !editAddonName.trim() || !editAddonPrice}
              className="bg-primary text-white py-2 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {savingAddon ? "Saving..." : "Save"}
            </button>
            <button
              onClick={closeAddonEdit}
              className="bg-background text-text-secondary border border-border py-2 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
            >
              Cancel
            </button>
          </div>
        </div>
      );
    }

    return (
      <div
        key={addon.id}
        className={`bg-surface rounded-card p-grid-2 shadow-card flex justify-between items-center ${
          !addon.isActive ? "opacity-60" : ""
        }`}
      >
        <div>
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{addon.name}</span>
            {addon.isMandatory && (
              <span className="text-xs bg-blue-100 text-blue-700 px-1.5 py-0.5 rounded-full">
                Mandatory
              </span>
            )}
            {!addon.isActive && (
              <span className="text-xs bg-surface-alt text-text-muted px-1.5 py-0.5 rounded-full">
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
        <div className="flex gap-2">
          <button
            onClick={() => openAddonEdit(addon)}
            className="text-xs font-medium px-3 py-1.5 rounded-button text-text-muted hover:text-primary transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => toggleAddonActive(addon)}
            className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
              addon.isActive
                ? "bg-background text-text-secondary border border-border hover:bg-border/40"
                : "bg-green-100 text-green-800 hover:bg-green-200"
            }`}
          >
            {addon.isActive ? "Disable" : "Enable"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-grid-3 max-w-lg">
      <Link href="/dashboard/services" className="text-sm text-text-muted hover:text-text-secondary">
        &larr; Back to services
      </Link>

      <h1 className="font-display text-2xl">Edit Service</h1>

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
                    : "bg-background text-text-secondary border border-border hover:bg-border/40"
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

      {/* Add-on Groups + Add-ons */}
      <section className="space-y-grid-2">
        <div className="flex justify-between items-center">
          <h2 className="text-lg font-medium">Add-ons</h2>
          <div className="flex gap-2">
            {!showGroupForm && (
              <button
                onClick={() => openGroupForm()}
                className="text-sm font-medium text-text-secondary hover:text-primary"
              >
                Add Group
              </button>
            )}
            {!showAddOn && (
              <button
                onClick={() => setShowAddOn(true)}
                className="text-sm font-medium text-primary hover:underline"
              >
                Add Add-on
              </button>
            )}
          </div>
        </div>

        {/* Group create/edit form */}
        {showGroupForm && (
          <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-1">
            <p className="text-sm font-medium">{editingGroupId ? "Edit Group" : "New Group"}</p>
            <div>
              <label className="block text-sm font-medium mb-1">Group Name</label>
              <input
                type="text"
                value={groupName}
                onChange={(e) => setGroupName(e.target.value)}
                maxLength={100}
                placeholder='e.g. "Nail Length"'
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              />
            </div>
            <div>
              <label className="block text-sm font-medium mb-1">Selection Rule</label>
              <div className="flex gap-grid-1">
                {(["OPTIONAL", "EXACTLY_ONE", "AT_LEAST_ONE"] as const).map((r) => (
                  <button
                    key={r}
                    type="button"
                    onClick={() => setGroupRule(r)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                      groupRule === r
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary border border-border hover:bg-border/40"
                    }`}
                  >
                    {RULE_LABELS[r]}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex gap-grid-1">
              <button
                onClick={handleSaveGroup}
                disabled={savingGroup || !groupName.trim()}
                className="bg-primary text-white py-2 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {savingGroup ? "Saving..." : editingGroupId ? "Update" : "Create"}
              </button>
              <button
                onClick={() => { setShowGroupForm(false); setEditingGroupId(null); }}
                className="bg-background text-text-secondary border border-border py-2 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

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
            <div>
              <label className="block text-sm font-medium mb-1">Group</label>
              <select
                value={addonGroupId}
                onChange={(e) => setAddonGroupId(e.target.value)}
                className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
              >
                <option value="">No group</option>
                {(service.addOnGroups || []).map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={addonMandatory}
                onChange={(e) => setAddonMandatory(e.target.checked)}
                className="rounded border-border"
              />
              Mandatory (always included)
            </label>
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
                className="bg-background text-text-secondary border border-border py-2 px-4 rounded-button text-sm font-medium hover:bg-border/40 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* Grouped add-ons list */}
        {groups.map((group) => (
          <div key={group.id} className="space-y-grid-1">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="text-sm font-semibold">{group.name}</span>
                <span className="text-xs bg-surface-alt text-text-muted px-1.5 py-0.5 rounded-full">
                  {RULE_LABELS[group.rule]}
                </span>
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => openGroupForm(group)}
                  className="text-xs text-text-muted hover:text-primary"
                >
                  Edit
                </button>
                <button
                  onClick={() => handleDeleteGroup(group.id)}
                  className="text-xs text-red-500 hover:text-red-700"
                >
                  Delete
                </button>
              </div>
            </div>
            {group.addOns.length === 0 ? (
              <p className="text-xs text-text-muted pl-2">No add-ons in this group.</p>
            ) : (
              group.addOns.map((addon) => renderAddonCard(addon))
            )}
          </div>
        ))}

        {/* Ungrouped add-ons */}
        {ungrouped.length > 0 && (
          <div className="space-y-grid-1">
            {groups.length > 0 && (
              <span className="text-sm font-semibold text-text-secondary">Other</span>
            )}
            {ungrouped.map((addon) => renderAddonCard(addon))}
          </div>
        )}

        {/* Empty state */}
        {service.addOns.length === 0 && !showAddOn && groups.length === 0 && (
          <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
            <p className="text-text-muted text-sm">No add-ons yet.</p>
          </div>
        )}
      </section>
    </div>
  );
}
