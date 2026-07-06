"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";
import { Check, X, ChevronDown, ChevronUp, RotateCcw } from "lucide-react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type TemplateType =
  | "BOOKING_CONFIRMATION"
  | "BOOKING_NOTIFICATION"
  | "CANCELLATION"
  | "COMPLETION"
  | "REMINDER"
  | "FOLLOWUP"
  | "WAITLIST_AVAILABLE"
  | "WAITLIST_JOINED";

type TemplateData = {
  type: TemplateType;
  emailSubject: string | null;
  emailBody: string | null;
  smsBody: string | null;
  isActive: boolean;
  defaults: { emailSubject: string; emailBody: string; smsBody: string };
  variables: string[];
};

type EditState = {
  emailSubject: string;
  emailBody: string;
  smsBody: string;
};

const TYPE_LABELS: Record<TemplateType, string> = {
  BOOKING_CONFIRMATION: "Booking confirmation",
  BOOKING_NOTIFICATION: "New booking (provider)",
  CANCELLATION: "Cancellation",
  COMPLETION: "Completion",
  REMINDER: "Reminder",
  FOLLOWUP: "Follow-up",
  WAITLIST_AVAILABLE: "Waitlist spot available",
  WAITLIST_JOINED: "Waitlist joined",
};

const TYPE_DESCRIPTIONS: Record<TemplateType, string> = {
  BOOKING_CONFIRMATION: "Sent to clients right after they book.",
  BOOKING_NOTIFICATION: "Sent to you when a client books.",
  CANCELLATION: "Sent when an appointment is cancelled.",
  COMPLETION: "Sent after an appointment is marked complete.",
  REMINDER: "Sent before an appointment, per your reminder schedule.",
  FOLLOWUP: "Sent after an appointment to ask for feedback.",
  WAITLIST_AVAILABLE: "Sent when a waitlist slot opens.",
  WAITLIST_JOINED: "Sent when a client joins a waitlist.",
};

export default function MessageTemplatesPage(): React.JSX.Element {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [edits, setEdits] = useState<Record<TemplateType, EditState>>({} as Record<TemplateType, EditState>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<TemplateType | null>(null);
  const [preview, setPreview] = useState<{ emailSubject: string; emailBody: string; smsBody: string } | null>(null);
  const [previewType, setPreviewType] = useState<TemplateType | null>(null);
  const focusedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);
  const reduce = useReducedMotion();

  const loadTemplates = useCallback(async () => {
    try {
      const res = await fetch("/api/message-templates");
      const json = await res.json();
      const data: TemplateData[] = json.data || [];
      setTemplates(data);

      const initialEdits: Record<string, EditState> = {};
      for (const tpl of data) {
        initialEdits[tpl.type] = {
          emailSubject: tpl.emailSubject ?? tpl.defaults.emailSubject,
          emailBody: tpl.emailBody ?? tpl.defaults.emailBody,
          smsBody: tpl.smsBody ?? tpl.defaults.smsBody,
        };
      }
      setEdits(initialEdits as Record<TemplateType, EditState>);
    } catch (e) {
      console.error("Failed to load templates:", e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTemplates();
  }, [loadTemplates]);

  function updateEdit(type: TemplateType, field: keyof EditState, value: string) {
    setEdits((prev) => ({
      ...prev,
      [type]: { ...prev[type], [field]: value },
    }));
  }

  function insertVariable(type: TemplateType, varName: string) {
    const field = focusedFieldRef.current;
    if (!field) return;

    const fieldKey = field.dataset.fieldKey as keyof EditState | undefined;
    if (!fieldKey) return;

    const insert = `{{${varName}}}`;
    const start = field.selectionStart ?? field.value.length;
    const end = field.selectionEnd ?? start;
    const before = field.value.slice(0, start);
    const after = field.value.slice(end);
    const newVal = before + insert + after;

    updateEdit(type, fieldKey, newVal);

    requestAnimationFrame(() => {
      field.focus();
      const cursorPos = start + insert.length;
      field.setSelectionRange(cursorPos, cursorPos);
    });
  }

  function resetToDefault(type: TemplateType) {
    const tpl = templates.find((t) => t.type === type);
    if (!tpl) return;
    setEdits((prev) => ({
      ...prev,
      [type]: {
        emailSubject: tpl.defaults.emailSubject,
        emailBody: tpl.defaults.emailBody,
        smsBody: tpl.defaults.smsBody,
      },
    }));
  }

  async function handleSave() {
    setSaving(true);
    try {
      const payload = templates.map((tpl) => {
        const edit = edits[tpl.type];
        const isDefault =
          edit.emailSubject === tpl.defaults.emailSubject &&
          edit.emailBody === tpl.defaults.emailBody &&
          edit.smsBody === tpl.defaults.smsBody;
        return {
          type: tpl.type,
          emailSubject: isDefault ? null : edit.emailSubject,
          emailBody: isDefault ? null : edit.emailBody,
          smsBody: isDefault ? null : edit.smsBody,
        };
      });

      const res = await fetch("/api/message-templates", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ templates: payload }),
      });

      if (res.ok) {
        showToast("Templates saved");
        await loadTemplates();
      } else {
        const json = await res.json();
        showToast(json.error?.message || "Failed to save");
      }
    } catch {
      showToast("Failed to save");
    } finally {
      setSaving(false);
    }
  }

  async function handlePreview(type: TemplateType) {
    const edit = edits[type];
    try {
      const res = await fetch("/api/message-templates/preview", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type,
          emailSubject: edit.emailSubject,
          emailBody: edit.emailBody,
          smsBody: edit.smsBody,
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setPreview(json.data);
        setPreviewType(type);
      }
    } catch {
      showToast("Preview failed");
    }
  }

  function showToast(msg: string) {
    setToast(msg);
    setTimeout(() => setToast(null), 3000);
  }

  if (loading) {
    return (
      <div className="max-w-4xl space-y-10">
        <div className="space-y-3">
          <div className="h-4 w-40 skeleton-shimmer bg-cream-100 rounded-md" />
          <div className="h-12 w-72 skeleton-shimmer bg-cream-100 rounded-md" />
          <div className="h-5 w-full max-w-96 skeleton-shimmer bg-cream-100 rounded-md" />
        </div>
        <div className="space-y-4">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="h-20 skeleton-shimmer bg-cream-100 rounded-md" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="pb-12">
      <div className="max-w-4xl space-y-10">
        <header className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
          <div className="space-y-2">
            <p className="text-label text-ink-500">Messages &middot; Templates</p>
            <Heading variant="display" className="text-3xl sm:text-4xl">Message templates</Heading>
            <p className="text-sm font-sans text-ink-500 max-w-xl leading-relaxed">
              The emails and texts your clients receive, in your words. Use{" "}
              <code className="font-sans text-ink-700 bg-cream-100 px-1.5 py-0.5 rounded-sm">{"{{variableName}}"}</code>{" "}
              placeholders for dynamic details.
            </p>
          </div>
          <Button variant="primary" size="md" onClick={handleSave} disabled={saving}>
            {saving ? "Saving…" : "Save all"}
          </Button>
        </header>

        <div className="space-y-3">
          {templates.map((tpl) => {
            const edit = edits[tpl.type];
            if (!edit) return null;
            const isExpanded = expandedType === tpl.type;

            const isCustomized =
              (tpl.emailSubject !== null && tpl.emailSubject !== tpl.defaults.emailSubject) ||
              (tpl.emailBody !== null && tpl.emailBody !== tpl.defaults.emailBody) ||
              (tpl.smsBody !== null && tpl.smsBody !== tpl.defaults.smsBody);

            return (
              <Card key={tpl.type} padding="none" className="overflow-hidden">
                <button
                  onClick={() => setExpandedType(isExpanded ? null : tpl.type)}
                  className="w-full flex items-center justify-between p-5 text-left transition-colors hover:bg-cream-100 focus-visible:outline-none focus-visible:bg-cream-100"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-sans text-base font-semibold tracking-tight text-ink-900">{TYPE_LABELS[tpl.type]}</h3>
                      {isCustomized && <Badge variant="verified">Customized</Badge>}
                    </div>
                    <p className="text-sm font-sans text-ink-500 mt-1">
                      {TYPE_DESCRIPTIONS[tpl.type]}
                    </p>
                  </div>
                  <span className="text-ink-500 ml-4 shrink-0">
                    {isExpanded ? <ChevronUp size={18} aria-hidden="true" /> : <ChevronDown size={18} aria-hidden="true" />}
                  </span>
                </button>

                {isExpanded && (
                  <div className="border-t border-ink-100 p-6 space-y-6">
                    {/* Variable chips */}
                    <div>
                      <label className="block text-xs font-sans font-medium tracking-wide uppercase text-ink-500 mb-2">
                        Available variables. Click to insert
                      </label>
                      <div className="flex flex-wrap gap-1.5">
                        {tpl.variables.map((v) => (
                          <button
                            key={v}
                            type="button"
                            onClick={() => insertVariable(tpl.type, v)}
                            className="text-xs font-sans rounded-pill bg-cream-100 text-ink-700 border border-ink-200 hover:border-ink-500 px-3 py-1.5 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                          >
                            {`{{${v}}}`}
                          </button>
                        ))}
                      </div>
                    </div>

                    {/* Email subject */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${tpl.type}-subject`}
                        className="block text-sm font-sans font-medium text-ink-700"
                      >
                        Email subject
                      </label>
                      <input
                        id={`${tpl.type}-subject`}
                        type="text"
                        value={edit.emailSubject}
                        data-field-key="emailSubject"
                        onChange={(e) => updateEdit(tpl.type, "emailSubject", e.target.value)}
                        onFocus={(e) => { focusedFieldRef.current = e.target; }}
                        className="w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                      />
                    </div>

                    {/* Email body */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${tpl.type}-email`}
                        className="block text-sm font-sans font-medium text-ink-700"
                      >
                        Email body
                      </label>
                      <textarea
                        id={`${tpl.type}-email`}
                        value={edit.emailBody}
                        data-field-key="emailBody"
                        onChange={(e) => updateEdit(tpl.type, "emailBody", e.target.value)}
                        onFocus={(e) => { focusedFieldRef.current = e.target; }}
                        rows={8}
                        className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-y"
                      />
                    </div>

                    {/* SMS body */}
                    <div className="space-y-1.5">
                      <label
                        htmlFor={`${tpl.type}-sms`}
                        className="block text-sm font-sans font-medium text-ink-700"
                      >
                        SMS body
                      </label>
                      <textarea
                        id={`${tpl.type}-sms`}
                        value={edit.smsBody}
                        data-field-key="smsBody"
                        onChange={(e) => updateEdit(tpl.type, "smsBody", e.target.value)}
                        onFocus={(e) => { focusedFieldRef.current = e.target; }}
                        rows={3}
                        className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-y"
                      />
                    </div>

                    <div className="flex flex-wrap items-center gap-2">
                      <Button variant="secondary" size="sm" onClick={() => handlePreview(tpl.type)}>
                        Preview
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => resetToDefault(tpl.type)}>
                        <RotateCcw size={14} aria-hidden="true" className="mr-1.5" />
                        Reset to default
                      </Button>
                    </div>
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Preview modal */}
      <AnimatePresence>
        {preview && previewType && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <motion.div
              className="absolute inset-0 bg-ink-900/40"
              onClick={() => { setPreview(null); setPreviewType(null); }}
              aria-hidden="true"
              initial={reduce ? false : { opacity: 0 }}
              animate={reduce ? undefined : { opacity: 1 }}
              exit={reduce ? undefined : { opacity: 0 }}
              transition={{ duration: 0.2, ease: "easeOut" }}
            />
            <motion.div
              initial={reduce ? false : { opacity: 0, scale: 0.96 }}
              animate={reduce ? undefined : { opacity: 1, scale: 1 }}
              exit={reduce ? undefined : { opacity: 0, scale: 0.96 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              className="relative max-w-lg w-full max-h-[80vh] flex"
            >
              <Card padding="none" className="w-full overflow-hidden flex flex-col shadow-soft">
            <div className="flex items-center justify-between px-6 py-4 border-b border-ink-100">
              <Heading variant="h3" className="text-xl">
                Preview · {TYPE_LABELS[previewType]}
              </Heading>
              <button
                onClick={() => { setPreview(null); setPreviewType(null); }}
                aria-label="Close preview"
                className="h-11 w-11 sm:h-9 sm:w-9 inline-flex items-center justify-center rounded-pill text-ink-700 hover:bg-cream-100 transition-colors"
              >
                <X size={18} aria-hidden="true" />
              </button>
            </div>

            <div className="overflow-y-auto px-6 py-5 space-y-5">
              <PreviewBlock label="Email subject" body={preview.emailSubject} />
              <PreviewBlock label="Email body" body={preview.emailBody} multiline />
              <PreviewBlock label="SMS" body={preview.smsBody} />
            </div>
              </Card>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50">
          <div className="rounded-md bg-ink-900 text-cream-50 text-sm font-sans font-medium px-4 py-2.5 shadow-soft inline-flex items-center gap-2">
            <Check size={14} aria-hidden="true" />
            {toast}
          </div>
        </div>
      )}
    </div>
  );
}

function PreviewBlock({
  label,
  body,
  multiline,
}: {
  label: string;
  body: string;
  multiline?: boolean;
}): React.JSX.Element {
  return (
    <div className="space-y-1.5">
      <p className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500">
        {label}
      </p>
      <div className="rounded-md border border-ink-200 bg-cream-100 px-4 py-3">
        {multiline ? (
          <pre className="text-sm font-sans text-ink-900 whitespace-pre-wrap leading-relaxed">
            {body}
          </pre>
        ) : (
          <p className="text-sm font-sans text-ink-900">{body}</p>
        )}
      </div>
    </div>
  );
}
