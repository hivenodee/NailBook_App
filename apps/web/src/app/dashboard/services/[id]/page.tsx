"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Check, Trash2 } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { SectionRule } from "@/components/ui/SectionRule";

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

type IntakeQuestion = {
  id: string;
  label: string;
  type: string;
  options: string[] | null;
  isRequired: boolean;
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
  EXACTLY_ONE: "Exactly one",
  AT_LEAST_ONE: "At least one",
};

const INPUT_CLASS =
  "w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50";

export default function EditServicePage(): React.JSX.Element {
  const { id } = useParams<{ id: string }>();
  const [service, setService] = useState<ServiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  // Service form state
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

  // Group form state
  const [showGroupForm, setShowGroupForm] = useState(false);
  const [editingGroupId, setEditingGroupId] = useState<string | null>(null);
  const [groupName, setGroupName] = useState("");
  const [groupRule, setGroupRule] =
    useState<"OPTIONAL" | "EXACTLY_ONE" | "AT_LEAST_ONE">("OPTIONAL");
  const [savingGroup, setSavingGroup] = useState(false);

  // Intake form state
  const [intakeQuestions, setIntakeQuestions] = useState<IntakeQuestion[]>([]);
  const [showIntakeForm, setShowIntakeForm] = useState(false);
  const [iqLabel, setIqLabel] = useState("");
  const [iqType, setIqType] = useState<"TEXT" | "SELECT" | "CHECKBOX">("TEXT");
  const [iqOptions, setIqOptions] = useState("");
  const [iqRequired, setIqRequired] = useState(false);
  const [iqSaving, setIqSaving] = useState(false);

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
            : String(s.depositValue),
        );
      }
    } catch (e) {
      console.error("Failed to load service:", e);
    } finally {
      setLoading(false);
    }
  }, [id]);

  const loadIntake = useCallback(async () => {
    try {
      const res = await fetch(`/api/services/${id}/intake`);
      const json = await res.json();
      setIntakeQuestions(json.data || []);
    } catch (e) {
      console.error("Failed to load intake questions:", e);
    }
  }, [id]);

  useEffect(() => {
    load();
    loadIntake();
  }, [load, loadIntake]);

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

  function openAddonEdit(addon: AddOn) {
    setEditingAddonId(addon.id);
    setEditAddonName(addon.name);
    setEditAddonPrice((addon.priceInCents / 100).toFixed(2));
    setEditAddonDuration(String(addon.durationMinutes));
    setEditAddonGroupId(addon.groupId || "");
    setEditAddonMandatory(addon.isMandatory);
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

  async function handleAddIntakeQuestion() {
    if (!iqLabel.trim()) return;
    setIqSaving(true);
    try {
      const options =
        (iqType === "SELECT" || iqType === "CHECKBOX") && iqOptions
          ? iqOptions.split(",").map((o) => o.trim()).filter(Boolean)
          : undefined;
      const res = await fetch(`/api/services/${id}/intake`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          label: iqLabel.trim(),
          type: iqType,
          options,
          isRequired: iqRequired,
          sortOrder: intakeQuestions.length,
        }),
      });
      if (res.ok) {
        setIqLabel("");
        setIqType("TEXT");
        setIqOptions("");
        setIqRequired(false);
        setShowIntakeForm(false);
        await loadIntake();
      }
    } catch (e) {
      console.error("Create question failed:", e);
    } finally {
      setIqSaving(false);
    }
  }

  async function handleDeleteIntakeQuestion(qid: string) {
    try {
      await fetch(`/api/services/${id}/intake/${qid}`, { method: "DELETE" });
      await loadIntake();
    } catch (e) {
      console.error("Delete question failed:", e);
    }
  }

  if (loading) {
    return (
      <div className="max-w-2xl space-y-6">
        <div className="h-5 w-32 skeleton-shimmer bg-cream-100 rounded-md" />
        <div className="h-12 w-48 skeleton-shimmer bg-cream-100 rounded-md" />
        <div className="h-64 skeleton-shimmer bg-cream-100 rounded-md" />
      </div>
    );
  }

  if (!service) {
    return (
      <div className="space-y-3">
        <p className="font-sans text-base text-ink-500">Service not found.</p>
        <Link
          href="/dashboard/services"
          className="inline-flex items-center gap-1.5 text-sm font-sans font-medium text-rust-500 hover:text-rust-600"
        >
          <ArrowLeft size={14} aria-hidden="true" />
          Back to services
        </Link>
      </div>
    );
  }

  const groups = (service.addOnGroups || [])
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((g) => ({
      ...g,
      addOns: service.addOns
        .filter((a) => a.groupId === g.id)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    }));
  const ungrouped = service.addOns
    .filter((a) => !a.groupId)
    .sort((a, b) => a.sortOrder - b.sortOrder);

  function renderAddonCard(addon: AddOn): React.JSX.Element {
    if (editingAddonId === addon.id) {
      return (
        <Card key={addon.id} padding="lg" className="border-rust-500/40 space-y-4">
          <p className="text-sm font-sans font-medium text-ink-900">Edit add-on</p>
          <FieldText label="Name" value={editAddonName} onChange={setEditAddonName} maxLength={100} />
          <div className="grid grid-cols-2 gap-3">
            <FieldText
              label="Price ($)"
              type="number"
              value={editAddonPrice}
              onChange={setEditAddonPrice}
              min="0"
              step="0.01"
            />
            <FieldText
              label="Extra time (min)"
              type="number"
              value={editAddonDuration}
              onChange={setEditAddonDuration}
              min="0"
              max="120"
              step="5"
            />
          </div>
          <FieldSelect
            label="Group"
            value={editAddonGroupId}
            onChange={setEditAddonGroupId}
            options={[
              { value: "", label: "No group" },
              ...(service!.addOnGroups || []).map((g) => ({ value: g.id, label: g.name })),
            ]}
          />
          <CheckboxRow
            label="Mandatory (always included)"
            checked={editAddonMandatory}
            onChange={setEditAddonMandatory}
          />
          <div className="flex gap-2">
            <Button
              variant="primary"
              size="sm"
              onClick={handleSaveAddon}
              disabled={savingAddon || !editAddonName.trim() || !editAddonPrice}
            >
              {savingAddon ? "Saving…" : "Save"}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setEditingAddonId(null)}>
              Cancel
            </Button>
          </div>
        </Card>
      );
    }

    return (
      <Card key={addon.id} padding="md" className={addon.isActive ? "" : "opacity-70"}>
        <div className="flex justify-between items-center gap-3">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-sm font-sans font-medium text-ink-900">{addon.name}</span>
              {addon.isMandatory && <Badge variant="verified">Mandatory</Badge>}
              {!addon.isActive && <Badge variant="status">Inactive</Badge>}
            </div>
            <div className="flex gap-3 text-xs font-sans mt-0.5">
              {/* Prices align down the add-on list, so tabular figures. */}
              <span className="font-semibold tracking-tight text-ink-900 tabular-nums">
                +${(addon.priceInCents / 100).toFixed(2)}
              </span>
              {addon.durationMinutes > 0 && (
                <span className="text-ink-500">+{addon.durationMinutes} min</span>
              )}
            </div>
          </div>
          <div className="flex gap-1.5 shrink-0">
            <Button variant="ghost" size="sm" onClick={() => openAddonEdit(addon)}>
              Edit
            </Button>
            <Button
              variant={addon.isActive ? "ghost" : "secondary"}
              size="sm"
              onClick={() => toggleAddonActive(addon)}
            >
              {addon.isActive ? "Disable" : "Enable"}
            </Button>
          </div>
        </div>
      </Card>
    );
  }

  return (
    <div className="max-w-2xl space-y-8">
      <Link
        href="/dashboard/services"
        className="inline-flex min-h-[44px] items-center gap-1.5 text-sm font-sans text-ink-500 hover:text-ink-700 transition-colors"
      >
        <ArrowLeft size={14} aria-hidden="true" />
        Back to services
      </Link>

      <header className="space-y-3">
        <p className="text-label text-ink-500">Services &middot; {service.name}</p>
        <Heading variant="display" className="text-3xl sm:text-4xl">Edit service</Heading>
        <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
          Pricing, add-ons, and the questions clients answer at booking.
        </p>
      </header>

      {/* Service fields */}
      <section className="space-y-4">
      <SectionRule label="Details" />
      <Card padding="lg" className="space-y-5">
        <FieldText label="Name" value={name} onChange={setName} maxLength={100} />
        <FieldText
          label="Description"
          value={description}
          onChange={setDescription}
          maxLength={500}
          placeholder="Optional"
        />
        <div className="grid grid-cols-2 gap-3">
          <FieldText
            label="Price ($)"
            type="number"
            value={price}
            onChange={setPrice}
            min="0"
            step="0.01"
          />
          <FieldText
            label="Duration (min)"
            type="number"
            value={duration}
            onChange={setDuration}
            min="15"
            max="480"
            step="15"
          />
        </div>

        <div className="space-y-2">
          <label className="block text-sm font-sans font-medium text-ink-700">Deposit</label>
          <ChipRow
            options={[
              { key: "NONE", label: "None" },
              { key: "FLAT", label: "Flat $" },
              { key: "PERCENT", label: "Percent %" },
            ]}
            selected={depositType}
            onSelect={(v) => {
              setDepositType(v);
              if (v === "NONE") setDepositValue("");
            }}
          />
          {depositType !== "NONE" && (
            <input
              type="number"
              value={depositValue}
              onChange={(e) => setDepositValue(e.target.value)}
              min="0"
              step={depositType === "FLAT" ? "0.01" : "1"}
              placeholder={depositType === "FLAT" ? "0.00" : "0"}
              className={`${INPUT_CLASS} mt-2 w-32`}
            />
          )}
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="primary"
            size="md"
            onClick={handleSave}
            disabled={saving || !name.trim() || !price}
          >
            {saving ? "Saving…" : "Save"}
          </Button>
          {saved && (
            <span className="inline-flex items-center gap-1.5 text-sm font-sans text-success">
              <Check size={14} aria-hidden="true" />
              Saved
            </span>
          )}
          {errorMsg && <span className="text-sm font-sans text-error">{errorMsg}</span>}
        </div>
      </Card>
      </section>

      {/* Add-on Groups + Add-ons */}
      <section className="space-y-4">
        <SectionRule label="Add-ons" />
        <div className="flex flex-wrap gap-2">
          {!showGroupForm && (
            <Button variant="ghost" size="sm" onClick={() => openGroupForm()}>
              Add group
            </Button>
          )}
          {!showAddOn && (
            <Button variant="secondary" size="sm" onClick={() => setShowAddOn(true)}>
              Add add-on
            </Button>
          )}
        </div>

        {/* Group form */}
        {showGroupForm && (
          <Card padding="lg" className="space-y-4">
            <p className="text-sm font-sans font-medium text-ink-900">
              {editingGroupId ? "Edit group" : "New group"}
            </p>
            <FieldText
              label="Group name"
              value={groupName}
              onChange={setGroupName}
              maxLength={100}
              placeholder='e.g. "Nail length"'
            />
            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-ink-700">
                Selection rule
              </label>
              <ChipRow
                options={(["OPTIONAL", "EXACTLY_ONE", "AT_LEAST_ONE"] as const).map((r) => ({
                  key: r,
                  label: RULE_LABELS[r],
                }))}
                selected={groupRule}
                onSelect={(v) => setGroupRule(v as typeof groupRule)}
              />
            </div>
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleSaveGroup}
                disabled={savingGroup || !groupName.trim()}
              >
                {savingGroup ? "Saving…" : editingGroupId ? "Update" : "Create"}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setShowGroupForm(false);
                  setEditingGroupId(null);
                }}
              >
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Create add-on form */}
        {showAddOn && (
          <Card padding="lg" className="space-y-4">
            <p className="text-sm font-sans font-medium text-ink-900">New add-on</p>
            <FieldText
              label="Name"
              value={addonName}
              onChange={setAddonName}
              maxLength={100}
              placeholder="e.g. Nail art"
            />
            <div className="grid grid-cols-2 gap-3">
              <FieldText
                label="Price ($)"
                type="number"
                value={addonPrice}
                onChange={setAddonPrice}
                min="0"
                step="0.01"
                placeholder="0.00"
              />
              <FieldText
                label="Extra time (min)"
                type="number"
                value={addonDuration}
                onChange={setAddonDuration}
                min="0"
                max="120"
                step="5"
              />
            </div>
            <FieldSelect
              label="Group"
              value={addonGroupId}
              onChange={setAddonGroupId}
              options={[
                { value: "", label: "No group" },
                ...(service.addOnGroups || []).map((g) => ({ value: g.id, label: g.name })),
              ]}
            />
            <CheckboxRow
              label="Mandatory (always included)"
              checked={addonMandatory}
              onChange={setAddonMandatory}
            />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleCreateAddon}
                disabled={creatingAddon || !addonName.trim() || !addonPrice}
              >
                {creatingAddon ? "Adding…" : "Add"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowAddOn(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {/* Grouped add-ons */}
        {groups.map((group) => (
          <div key={group.id} className="space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <span className="font-sans font-semibold text-sm text-ink-900">{group.name}</span>
                <Badge variant="status">{RULE_LABELS[group.rule]}</Badge>
              </div>
              <div className="flex gap-1.5">
                <Button variant="ghost" size="sm" onClick={() => openGroupForm(group)}>
                  Edit
                </Button>
                <Button variant="ghost" size="sm" onClick={() => handleDeleteGroup(group.id)}>
                  Delete
                </Button>
              </div>
            </div>
            {group.addOns.length === 0 ? (
              <p className="text-xs font-sans text-ink-500 pl-2">No add-ons in this group.</p>
            ) : (
              group.addOns.map((addon) => renderAddonCard(addon))
            )}
          </div>
        ))}

        {/* Ungrouped add-ons */}
        {ungrouped.length > 0 && (
          <div className="space-y-2">
            {groups.length > 0 && (
              <span className="font-sans font-semibold text-sm text-ink-700">Other</span>
            )}
            {ungrouped.map((addon) => renderAddonCard(addon))}
          </div>
        )}

        {/* Empty state */}
        {service.addOns.length === 0 && !showAddOn && groups.length === 0 && (
          <Card padding="lg" className="border-dashed">
            <p className="text-center text-sm font-sans text-ink-500">No add-ons yet.</p>
          </Card>
        )}
      </section>

      {/* Intake Form */}
      <section className="space-y-4">
        <SectionRule label="Intake form" />
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-sans text-ink-500">
            Questions clients answer when booking this service.
          </p>
          {!showIntakeForm && (
            <Button variant="secondary" size="sm" onClick={() => setShowIntakeForm(true)}>
              Add question
            </Button>
          )}
        </div>

        {showIntakeForm && (
          <Card padding="lg" className="space-y-4">
            <p className="text-sm font-sans font-medium text-ink-900">New question</p>
            <FieldText
              label="Question"
              value={iqLabel}
              onChange={setIqLabel}
              maxLength={300}
              placeholder="e.g. Do you have any allergies?"
            />
            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-ink-700">Type</label>
              <ChipRow
                options={[
                  { key: "TEXT", label: "Text" },
                  { key: "SELECT", label: "Dropdown" },
                  { key: "CHECKBOX", label: "Checkboxes" },
                ]}
                selected={iqType}
                onSelect={(v) => setIqType(v as typeof iqType)}
              />
            </div>
            {(iqType === "SELECT" || iqType === "CHECKBOX") && (
              <FieldText
                label="Options (comma-separated)"
                value={iqOptions}
                onChange={setIqOptions}
                placeholder="e.g. Gel, Acrylic, Dip"
              />
            )}
            <CheckboxRow label="Required" checked={iqRequired} onChange={setIqRequired} />
            <div className="flex gap-2">
              <Button
                variant="primary"
                size="sm"
                onClick={handleAddIntakeQuestion}
                disabled={iqSaving || !iqLabel.trim()}
              >
                {iqSaving ? "Adding…" : "Add"}
              </Button>
              <Button variant="ghost" size="sm" onClick={() => setShowIntakeForm(false)}>
                Cancel
              </Button>
            </div>
          </Card>
        )}

        {intakeQuestions.map((q) => (
          <Card key={q.id} padding="md">
            <div className="flex justify-between items-start gap-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-sans font-medium text-ink-900">{q.label}</p>
                <div className="flex gap-2 mt-1 flex-wrap">
                  <Badge variant="status">
                    {q.type === "TEXT" ? "Text" : q.type === "SELECT" ? "Dropdown" : "Checkboxes"}
                  </Badge>
                  {q.isRequired && <Badge variant="verified">Required</Badge>}
                </div>
                {q.options && (q.options as string[]).length > 0 && (
                  <p className="text-xs font-sans text-ink-500 mt-1.5">
                    Options: {(q.options as string[]).join(", ")}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={() => handleDeleteIntakeQuestion(q.id)}
                aria-label="Delete question"
                className="h-11 w-11 shrink-0 inline-flex items-center justify-center rounded-pill text-ink-500 hover:text-error hover:bg-cream-100 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              >
                <Trash2 size={14} aria-hidden="true" />
              </button>
            </div>
          </Card>
        ))}

        {intakeQuestions.length === 0 && !showIntakeForm && (
          <Card padding="lg" className="border-dashed">
            <p className="text-center text-sm font-sans text-ink-500">
              No intake questions yet.
            </p>
          </Card>
        )}
      </section>
    </div>
  );
}

/* ────────────────── helpers ────────────────── */

function FieldText({
  label,
  value,
  onChange,
  type = "text",
  ...rest
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, "onChange" | "value" | "type">): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-sans font-medium text-ink-700">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={INPUT_CLASS}
        {...rest}
      />
    </div>
  );
}

function FieldSelect({
  label,
  value,
  onChange,
  options,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string }[];
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-sans font-medium text-ink-700">{label}</label>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={INPUT_CLASS}>
        {options.map((o) => (
          <option key={o.value} value={o.value}>
            {o.label}
          </option>
        ))}
      </select>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onChange,
}: {
  label: string;
  checked: boolean;
  onChange: (v: boolean) => void;
}): React.JSX.Element {
  return (
    <label className="flex items-center gap-2 text-sm font-sans text-ink-700 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="h-4 w-4 rounded border-ink-300 text-rust-500 focus:ring-rust-500 focus:ring-offset-cream-50"
      />
      {label}
    </label>
  );
}

function ChipRow<T extends string>({
  options,
  selected,
  onSelect,
}: {
  options: { key: T; label: string }[];
  selected: T;
  onSelect: (val: T) => void;
}): React.JSX.Element {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => {
        const active = o.key === selected;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onSelect(o.key)}
            className={
              "shrink-0 h-9 rounded-pill px-4 text-sm font-sans font-medium border transition-colors " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 " +
              (active
                ? "bg-rust-500 text-cream-50 border-rust-500"
                : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
