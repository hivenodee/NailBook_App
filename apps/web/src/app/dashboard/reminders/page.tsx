"use client";

import React, { useEffect, useMemo, useState, useCallback } from "react";
import { Bell, Mail, MessageSquare, X, Check, AlertTriangle } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";
import { EmptyState } from "@/components/ui/EmptyState";
import { SectionRule } from "@/components/ui/SectionRule";

/* ─────────────────────────── Types ─────────────────────────── */

type Channel = "EMAIL" | "SMS" | "PUSH";

type ReminderSetting = {
  id?: string;
  hoursBefore: number;
  channels: Channel[];
  enabled: boolean;
};

type Template = {
  type: string;
  emailSubject: string | null;
  emailBody: string | null;
  smsBody: string | null;
  isActive: boolean;
  defaults: { emailSubject: string; emailBody: string; smsBody: string };
  variables: readonly string[];
};

type Stats = { sent: number; delivered: number; failed: number };

/* The four reminder slots the UI presents. Two are wired to real
   ReminderSetting rows; two are visual placeholders for schema gaps. */
type SlotKey = "T_MINUS_24H" | "T_MINUS_1H" | "FOLLOWUP" | "REBOOK";

type Slot = {
  key: SlotKey;
  name: string;
  description: string;
  hoursBefore: number | null; // null = not modeled in current schema
  templateType: "REMINDER" | "FOLLOWUP" | null;
  comingSoon?: boolean;
};

const SLOTS: Slot[] = [
  {
    key: "T_MINUS_24H",
    name: "24-hour reminder",
    description: "Sent 24 hours before the appointment.",
    hoursBefore: 24,
    templateType: "REMINDER",
  },
  {
    key: "T_MINUS_1H",
    name: "1-hour reminder",
    description: "A quick nudge an hour before the appointment.",
    hoursBefore: 1,
    templateType: "REMINDER",
  },
  {
    key: "FOLLOWUP",
    name: "Follow-up thank you",
    description: "Sent one hour after the appointment ends.",
    hoursBefore: null,
    templateType: "FOLLOWUP",
    comingSoon: true,
  },
  {
    key: "REBOOK",
    name: "Rebook nudge",
    description: "Sent four weeks after the last appointment.",
    hoursBefore: null,
    templateType: null,
    comingSoon: true,
  },
];

const CHANNELS: { value: Channel; label: string }[] = [
  { value: "SMS",   label: "SMS"   },
  { value: "EMAIL", label: "Email" },
];

/* ─────────────────────────── Page ─────────────────────────── */

export default function RemindersPage(): React.JSX.Element {
  const [settings, setSettings] = useState<ReminderSetting[]>([]);
  const [templates, setTemplates] = useState<Template[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [editingSlot, setEditingSlot] = useState<Slot | null>(null);

  const loadAll = useCallback(async () => {
    try {
      const [s, t, st] = await Promise.all([
        fetch("/api/reminders/settings").then((r) => r.json()),
        fetch("/api/message-templates").then((r) => r.json()),
        fetch("/api/reminders/stats").then((r) => r.json()),
      ]);
      setSettings(s.data?.settings || []);
      setTemplates(t.data || []);
      setStats(st.data || { sent: 0, delivered: 0, failed: 0 });
    } catch (e) {
      console.error("Failed to load reminders:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  /* Map a slot to its ReminderSetting row + template (if available). */
  function settingForSlot(slot: Slot): ReminderSetting | null {
    if (slot.hoursBefore == null) return null;
    return settings.find((s) => s.hoursBefore === slot.hoursBefore) ?? null;
  }

  function templateForSlot(slot: Slot): Template | null {
    if (!slot.templateType) return null;
    return templates.find((t) => t.type === slot.templateType) ?? null;
  }

  /* Surface "extras": custom reminder settings that aren't 1h or 24h.
     We keep these visible so power users don't lose existing rows. */
  const extras = useMemo(
    () => settings.filter((s) => s.hoursBefore !== 1 && s.hoursBefore !== 24),
    [settings],
  );

  const enabledCount = useMemo(
    () => SLOTS.filter((s) => settingForSlot(s)?.enabled).length + extras.filter((e) => e.enabled).length,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [settings, extras],
  );

  /* ─── Mutations ─── */

  async function persistSettings(next: ReminderSetting[]) {
    setSaving(true);
    setSaveError(null);
    try {
      const res = await fetch("/api/reminders/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ settings: next }),
      });
      const json = await res.json();
      if (!res.ok) {
        setSaveError(json.error?.message || "Failed to save settings");
        return;
      }
      if (json.data?.settings) setSettings(json.data.settings);
    } catch (e) {
      console.error(e);
      setSaveError("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  function toggleSlot(slot: Slot, on: boolean) {
    if (slot.hoursBefore == null) return; // schema gap
    const existing = settingForSlot(slot);
    let next: ReminderSetting[];
    if (existing) {
      next = settings.map((s) =>
        s.hoursBefore === slot.hoursBefore ? { ...s, enabled: on } : s,
      );
    } else {
      next = [
        ...settings,
        { hoursBefore: slot.hoursBefore, channels: ["EMAIL"], enabled: on },
      ];
    }
    setSettings(next);
    persistSettings(next);
  }

  function setSlotChannels(slot: Slot, channels: Channel[]) {
    if (slot.hoursBefore == null) return;
    const existing = settingForSlot(slot);
    let next: ReminderSetting[];
    if (existing) {
      next = settings.map((s) =>
        s.hoursBefore === slot.hoursBefore ? { ...s, channels } : s,
      );
    } else {
      next = [
        ...settings,
        { hoursBefore: slot.hoursBefore, channels, enabled: true },
      ];
    }
    setSettings(next);
    persistSettings(next);
  }

  /* ─── Skeleton ─── */

  if (loading) {
    return (
      <div className="max-w-4xl space-y-10">
        <div className="space-y-3">
          <div className="h-12 w-44 skeleton-shimmer rounded-md" />
          <div className="h-5 w-96 skeleton-shimmer rounded-md" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-40 skeleton-shimmer rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="max-w-4xl space-y-14">
        <header className="space-y-3">
          <p className="text-label text-ink-500">Reminders &middot; Automated messages</p>
          <Heading variant="display" className="text-3xl sm:text-4xl">Reminders</Heading>
          <p className="font-sans text-sm text-ink-500 max-w-md leading-relaxed">
            Automated messages keep clients on schedule and reduce no-shows.
          </p>
        </header>

        {/* ─────────────────────── SECTION 1 ─────────────────────── */}
        <section className="space-y-6">
          <SectionRule label="Active reminders" />
          <div className="flex items-end justify-between gap-4">
            <p className="font-sans text-sm text-ink-500 max-w-xl leading-relaxed">
              Turn each reminder on or off, choose how it&rsquo;s delivered, and
              edit the words clients see.
            </p>
            <p className="hidden sm:block text-xs font-sans text-ink-500 shrink-0">
              {enabledCount} of {SLOTS.length + extras.length} on
            </p>
          </div>

          {enabledCount === 0 ? (
            <EmptyStateWrapper
              onEnable24h={() =>
                toggleSlot(SLOTS[0], true)
              }
            />
          ) : null}

          <div className="space-y-4">
            {SLOTS.map((slot) => (
              <ReminderCard
                key={slot.key}
                slot={slot}
                setting={settingForSlot(slot)}
                template={templateForSlot(slot)}
                onToggle={(on) => toggleSlot(slot, on)}
                onChannels={(c) => setSlotChannels(slot, c)}
                onEdit={() => slot.templateType && setEditingSlot(slot)}
                saving={saving}
              />
            ))}

            {extras.map((e) => (
              <ExtraReminderCard
                key={`extra-${e.hoursBefore}`}
                setting={e}
                onToggle={(on) => {
                  const next = settings.map((s) =>
                    s.hoursBefore === e.hoursBefore ? { ...s, enabled: on } : s,
                  );
                  setSettings(next);
                  persistSettings(next);
                }}
              />
            ))}
          </div>

          {saveError && (
            <div className="rounded-md border border-error/30 bg-error/10 px-4 py-3 text-sm font-sans text-error">
              {saveError}
            </div>
          )}
        </section>

        {/* ─────────────────────── SECTION 2 ─────────────────────── */}
        <section className="space-y-6">
          <SectionRule label="Message templates" />
          <p className="font-sans text-sm text-ink-500 max-w-xl leading-relaxed">
            Customize what clients see. Use{" "}
            <code className="font-sans text-ink-700 bg-cream-100 px-1.5 py-0.5 rounded-sm">{"{{clientName}}"}</code>,{" "}
            <code className="font-sans text-ink-700 bg-cream-100 px-1.5 py-0.5 rounded-sm">{"{{serviceName}}"}</code>,{" "}
            <code className="font-sans text-ink-700 bg-cream-100 px-1.5 py-0.5 rounded-sm">{"{{dateTime}}"}</code>{" "}
            as placeholders.
          </p>

          <Card padding="lg" className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <p className="text-sm font-sans font-medium text-ink-900">Edit reminder copy</p>
                <p className="text-xs font-sans text-ink-500 mt-0.5">
                  One template applies to all reminders of that type. Per-reminder copy is coming.
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingSlot(SLOTS[0])}
                >
                  Edit reminder
                </Button>
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setEditingSlot(SLOTS[2])}
                >
                  Edit follow-up
                </Button>
              </div>
            </div>
          </Card>
        </section>

        {/* ─────────────────────── SECTION 3 ─────────────────────── */}
        <section className="space-y-6">
          <SectionRule label="Delivery stats" />
          <p className="font-sans text-sm text-ink-500 leading-relaxed">
            {`This month, since ${new Date(
              new Date().getFullYear(),
              new Date().getMonth(),
              1,
            ).toLocaleDateString(undefined, { month: "long", day: "numeric" })}.`}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <StatCard label="Sent this month" value={stats?.sent ?? 0} />
            <StatCard label="Delivered" value={stats?.delivered ?? 0} />
            <StatCard
              label="Failed"
              value={stats?.failed ?? 0}
              tone={(stats?.failed ?? 0) > 0 ? "warn" : "neutral"}
            />
          </div>

          <p className="text-sm font-sans text-ink-300">
            Detailed history is coming soon.
          </p>
        </section>
      </div>

      {/* Side drawer / mobile full-screen modal */}
      {editingSlot && (
        <TemplateDrawer
          slot={editingSlot}
          template={templateForSlot(editingSlot)}
          onClose={() => setEditingSlot(null)}
          onSaved={async () => {
            const t = await fetch("/api/message-templates").then((r) => r.json());
            setTemplates(t.data || []);
            setEditingSlot(null);
          }}
        />
      )}
    </div>
  );
}

/* ─────────────────────── Reminder card ─────────────────────── */

function ReminderCard({
  slot,
  setting,
  template,
  onToggle,
  onChannels,
  onEdit,
  saving,
}: {
  slot: Slot;
  setting: ReminderSetting | null;
  template: Template | null;
  onToggle: (on: boolean) => void;
  onChannels: (c: Channel[]) => void;
  onEdit: () => void;
  saving: boolean;
}): React.JSX.Element {
  const enabled = setting?.enabled ?? false;
  const channels = (setting?.channels ?? ["EMAIL"]) as Channel[];
  const channelLabel = channelBadge(channels);

  const previewBody =
    template?.smsBody ||
    template?.defaults.smsBody ||
    template?.emailBody ||
    template?.defaults.emailBody ||
    "";

  return (
    <Card padding="lg" className={enabled ? "" : "opacity-70"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="font-sans text-base font-semibold text-ink-900">{slot.name}</h3>
            {slot.comingSoon && (
              <Badge variant="status">Coming soon</Badge>
            )}
          </div>
          <p className="text-sm font-sans text-ink-500">{slot.description}</p>
        </div>
        <Switch
          checked={enabled}
          disabled={slot.comingSoon || saving}
          onChange={onToggle}
          ariaLabel={`Toggle ${slot.name}`}
        />
      </div>

      {!slot.comingSoon && (
        <>
          <div className="mt-5 flex items-center gap-2 flex-wrap">
            <span className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500">
              Channel
            </span>
            <ChannelChips
              channels={channels}
              onChange={onChannels}
              disabled={!enabled}
            />
            {channelLabel && (
              <Badge variant="neutral" className="ml-auto">
                {channelLabel}
              </Badge>
            )}
          </div>

          <div className="mt-5 rounded-md border border-ink-200 bg-cream-100 p-4">
            <p className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500 mb-2">
              Preview
            </p>
            <p className="text-sm font-sans text-ink-700 whitespace-pre-line line-clamp-3">
              {previewBody || "Default message will be used."}
            </p>
          </div>

          <div className="mt-5 flex justify-end">
            <Button variant="ghost" size="sm" onClick={onEdit} disabled={!template}>
              Edit
            </Button>
          </div>
        </>
      )}

      {slot.comingSoon && (
        <p className="mt-4 text-xs font-sans text-ink-500">
          This reminder is on the way. You will be able to turn it on here.
        </p>
      )}
    </Card>
  );
}

function ExtraReminderCard({
  setting,
  onToggle,
}: {
  setting: ReminderSetting;
  onToggle: (on: boolean) => void;
}): React.JSX.Element {
  const label =
    setting.hoursBefore >= 24
      ? `${Math.round(setting.hoursBefore / 24)}-day reminder`
      : `${setting.hoursBefore}-hour reminder`;
  return (
    <Card padding="lg" className={setting.enabled ? "" : "opacity-70"}>
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <h3 className="font-sans text-base font-semibold text-ink-900">{label}</h3>
            <Badge variant="neutral">Custom</Badge>
          </div>
          <p className="text-sm font-sans text-ink-500">
            Sent {setting.hoursBefore} hours before the appointment.
          </p>
          <div className="pt-1">
            <Badge variant="neutral">{channelBadge(setting.channels) || "No channel"}</Badge>
          </div>
        </div>
        <Switch
          checked={setting.enabled}
          onChange={onToggle}
          ariaLabel={`Toggle ${label}`}
        />
      </div>
    </Card>
  );
}

/* ─────────────────────── Drawer ─────────────────────── */

function TemplateDrawer({
  slot,
  template,
  onClose,
  onSaved,
}: {
  slot: Slot;
  template: Template | null;
  onClose: () => void;
  onSaved: () => void;
}): React.JSX.Element {
  const [smsBody, setSmsBody] = useState(template?.smsBody ?? "");
  const [emailSubject, setEmailSubject] = useState(template?.emailSubject ?? "");
  const [emailBody, setEmailBody] = useState(template?.emailBody ?? "");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const smsDefault = template?.defaults.smsBody ?? "";
  const emailSubjectDefault = template?.defaults.emailSubject ?? "";
  const emailBodyDefault = template?.defaults.emailBody ?? "";

  const effectiveSms = smsBody || smsDefault;
  const effectiveSubject = emailSubject || emailSubjectDefault;
  const effectiveBody = emailBody || emailBodyDefault;

  const smsLen = effectiveSms.length;
  const overSmsLimit = smsLen > 160;

  async function save() {
    setSaving(true);
    setErr(null);
    try {
      const res = await fetch("/api/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          templates: [
            {
              type: slot.templateType,
              emailSubject: emailSubject || null,
              emailBody: emailBody || null,
              smsBody: smsBody || null,
            },
          ],
        }),
      });
      const json = await res.json();
      if (!res.ok) {
        setErr(json.error?.message || "Failed to save");
        return;
      }
      onSaved();
    } catch (e) {
      console.error(e);
      setErr("Network error. Please try again.");
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-40">
      <div
        className="absolute inset-0 bg-ink-900/40"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${slot.name}`}
        className="absolute inset-0 sm:inset-y-0 sm:right-0 sm:left-auto sm:w-[760px] bg-cream-50 sm:border-l border-ink-200 shadow-xl flex flex-col"
      >
        <div className="flex items-center justify-between px-6 py-5 border-b border-ink-100">
          <div>
            <p className="text-label text-ink-500">Edit template</p>
            <Heading variant="h3" className="text-2xl mt-1">{slot.name}</Heading>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="h-9 w-9 inline-flex items-center justify-center rounded-pill text-ink-700 hover:bg-cream-100 transition-colors"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-0 lg:gap-6 px-6 py-6">
            {/* Editor side */}
            <div className="space-y-6">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label htmlFor="sms" className="text-sm font-sans font-medium text-ink-700 inline-flex items-center gap-2">
                    <MessageSquare size={14} aria-hidden="true" />
                    SMS body
                  </label>
                  <span
                    className={
                      "text-xs font-sans tabular-nums " +
                      (overSmsLimit ? "text-error" : "text-ink-500")
                    }
                  >
                    {smsLen}/160
                  </span>
                </div>
                <textarea
                  id="sms"
                  value={smsBody}
                  onChange={(e) => setSmsBody(e.target.value)}
                  placeholder={smsDefault}
                  rows={3}
                  className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-none"
                />
                {overSmsLimit && (
                  <p className="text-xs font-sans text-error mt-1.5 inline-flex items-center gap-1">
                    <AlertTriangle size={12} aria-hidden="true" />
                    Long SMS messages may be split into multiple texts and cost more.
                  </p>
                )}
                <p className="text-xs font-sans text-ink-500 mt-1.5">
                  Leave empty to use the default.
                </p>
              </div>

              <div>
                <label htmlFor="subject" className="text-sm font-sans font-medium text-ink-700 inline-flex items-center gap-2 mb-1.5">
                  <Mail size={14} aria-hidden="true" />
                  Email subject
                </label>
                <input
                  id="subject"
                  type="text"
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  placeholder={emailSubjectDefault}
                  className="w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                />
              </div>

              <div>
                <label htmlFor="email" className="text-sm font-sans font-medium text-ink-700 mb-1.5 block">
                  Email body
                </label>
                <textarea
                  id="email"
                  value={emailBody}
                  onChange={(e) => setEmailBody(e.target.value)}
                  placeholder={emailBodyDefault}
                  rows={8}
                  className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-none"
                />
              </div>

              {template && (
                <div className="text-xs font-sans text-ink-500">
                  Available variables:{" "}
                  {template.variables.map((v, i) => (
                    <code
                      key={v}
                      className="font-sans text-ink-700 bg-cream-100 px-1.5 py-0.5 rounded-sm mr-1"
                    >
                      {`{{${v}}}`}
                      {i === template.variables.length - 1 ? "" : ""}
                    </code>
                  ))}
                </div>
              )}
            </div>

            {/* Preview side */}
            <div className="lg:sticky lg:top-6 self-start mt-8 lg:mt-0">
              <p className="text-label text-ink-500 mb-3">Preview</p>
              <div className="space-y-4">
                <Card padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <MessageSquare size={14} aria-hidden="true" className="text-ink-500" />
                    <p className="text-xs font-sans font-medium text-ink-500">SMS</p>
                  </div>
                  <div className="rounded-md border border-ink-200 bg-cream-100 p-4">
                    <p className="text-sm font-sans text-ink-900 whitespace-pre-line">
                      {renderSample(effectiveSms)}
                    </p>
                  </div>
                </Card>

                <Card padding="md">
                  <div className="flex items-center gap-2 mb-2">
                    <Mail size={14} aria-hidden="true" className="text-ink-500" />
                    <p className="text-xs font-sans font-medium text-ink-500">Email</p>
                  </div>
                  <div className="rounded-md border border-ink-200 bg-cream-100 p-4 space-y-2">
                    <p className="text-sm font-sans font-medium text-ink-900">
                      {renderSample(effectiveSubject)}
                    </p>
                    <p className="text-sm font-sans text-ink-700 whitespace-pre-line">
                      {renderSample(effectiveBody)}
                    </p>
                  </div>
                </Card>
              </div>
            </div>
          </div>
        </div>

        <div className="px-6 py-4 border-t border-ink-100 flex items-center justify-end gap-2 bg-cream-50">
          {err && <span className="text-sm font-sans text-error mr-auto">{err}</span>}
          <Button variant="ghost" size="sm" onClick={onClose}>Cancel</Button>
          <Button variant="primary" size="sm" onClick={save} disabled={saving}>
            {saving ? "Saving…" : "Save template"}
          </Button>
        </div>
      </div>
    </div>
  );
}

/* ─────────────────────── Helpers ─────────────────────── */

function StatCard({
  label,
  value,
  tone = "neutral",
}: {
  label: string;
  value: number;
  tone?: "neutral" | "warn";
}): React.JSX.Element {
  return (
    <Card padding="lg" className="space-y-1">
      <p className={
        "font-sans text-4xl font-semibold tracking-tight " +
        (tone === "warn" ? "text-warning" : "text-ink-900")
      }>
        {value.toLocaleString()}
      </p>
      <p className="text-sm font-sans text-ink-500">{label}</p>
    </Card>
  );
}

function Switch({
  checked,
  disabled,
  onChange,
  ariaLabel,
}: {
  checked: boolean;
  disabled?: boolean;
  onChange: (val: boolean) => void;
  ariaLabel: string;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={ariaLabel}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={
        "relative h-6 w-11 rounded-pill transition-colors shrink-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 disabled:opacity-50 disabled:cursor-not-allowed " +
        (checked ? "bg-rust-500" : "bg-ink-200")
      }
    >
      <span
        className={
          "absolute top-0.5 left-0.5 h-5 w-5 rounded-pill bg-cream-50 shadow-sm transition-transform " +
          (checked ? "translate-x-5" : "translate-x-0")
        }
      />
    </button>
  );
}

function ChannelChips({
  channels,
  onChange,
  disabled,
}: {
  channels: Channel[];
  onChange: (c: Channel[]) => void;
  disabled?: boolean;
}): React.JSX.Element {
  function toggle(ch: Channel) {
    const has = channels.includes(ch);
    if (has) {
      const next = channels.filter((c) => c !== ch);
      if (next.length === 0) return; // require at least one
      onChange(next);
    } else {
      onChange([...channels, ch]);
    }
  }

  return (
    <div className="flex gap-2">
      {CHANNELS.map((c) => {
        const active = channels.includes(c.value);
        return (
          <button
            key={c.value}
            type="button"
            disabled={disabled}
            onClick={() => toggle(c.value)}
            className={
              "h-9 rounded-pill px-4 text-sm font-sans font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed " +
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 " +
              (active
                ? "bg-rust-500 text-cream-50 border border-rust-500"
                : "bg-cream-50 text-ink-700 border border-ink-200 hover:border-ink-300")
            }
          >
            {active && <Check size={10} className="inline mr-1" aria-hidden="true" />}
            {c.label}
          </button>
        );
      })}
    </div>
  );
}

function channelBadge(channels: Channel[]): string {
  const set = new Set(channels);
  const sms = set.has("SMS");
  const email = set.has("EMAIL");
  if (sms && email) return "SMS & email";
  if (sms) return "SMS";
  if (email) return "Email";
  return "";
}

function renderSample(template: string): string {
  // Light-touch placeholder substitution for preview only.
  const samples: Record<string, string> = {
    clientName: "Maya",
    serviceName: "Gel Full Set",
    providerName: "Glamour Nails",
    dateTime: "Saturday, March 15 at 2:00 PM",
    duration: "90",
    hoursUntil: "24",
    location: "123 Main St, Suite 4",
    manageUrl: "https://porobook.app/m/abc",
    paymentLine: "Deposit paid: $25.00",
  };
  return template.replace(/\{\{(\w+)\}\}/g, (_, k) => samples[k] ?? `{{${k}}}`);
}

/* ─────────────────────── Empty state ─────────────────────── */

function EmptyStateWrapper({
  onEnable24h,
}: {
  onEnable24h: () => void;
}): React.JSX.Element {
  return (
    <Card padding="lg">
      <EmptyState
        variant="icon"
        icon={Bell}
        size="sm"
        title="No reminders enabled"
        description="Turn on reminders to reduce no-shows and keep clients informed."
        action={{
          label: "Enable 24-hour reminder",
          onClick: onEnable24h,
        }}
      />
    </Card>
  );
}
