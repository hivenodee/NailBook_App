"use client";

import React, { useEffect, useState, useRef, useCallback } from "react";

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
  BOOKING_CONFIRMATION: "Booking Confirmation",
  BOOKING_NOTIFICATION: "New Booking (Provider)",
  CANCELLATION: "Cancellation",
  COMPLETION: "Completion",
  REMINDER: "Reminder",
  FOLLOWUP: "Follow-up",
  WAITLIST_AVAILABLE: "Waitlist — Spot Available",
  WAITLIST_JOINED: "Waitlist — Joined Confirmation",
};

export default function MessagesPage(): React.JSX.Element {
  const [templates, setTemplates] = useState<TemplateData[]>([]);
  const [edits, setEdits] = useState<Record<TemplateType, EditState>>({} as Record<TemplateType, EditState>);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [expandedType, setExpandedType] = useState<TemplateType | null>(null);
  const [preview, setPreview] = useState<{ emailSubject: string; emailBody: string; smsBody: string } | null>(null);
  const [previewType, setPreviewType] = useState<TemplateType | null>(null);
  const focusedFieldRef = useRef<HTMLInputElement | HTMLTextAreaElement | null>(null);

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

    // Restore cursor position after React re-render
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
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-grid-3">
      <div className="flex justify-between items-center">
        <h1 className="font-display text-2xl">Message Templates</h1>
        <button
          onClick={handleSave}
          disabled={saving}
          className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50"
        >
          {saving ? "Saving..." : "Save All"}
        </button>
      </div>

      <p className="text-sm text-text-muted">
        Customize the emails and SMS messages sent to your clients. Use {"{{variableName}}"} placeholders for dynamic content.
      </p>

      {templates.map((tpl) => {
        const edit = edits[tpl.type];
        if (!edit) return null;
        const isExpanded = expandedType === tpl.type;

        const isCustomized =
          (tpl.emailSubject !== null && tpl.emailSubject !== tpl.defaults.emailSubject) ||
          (tpl.emailBody !== null && tpl.emailBody !== tpl.defaults.emailBody) ||
          (tpl.smsBody !== null && tpl.smsBody !== tpl.defaults.smsBody);

        return (
          <div key={tpl.type} className="bg-surface rounded-card shadow-card overflow-hidden">
            <button
              onClick={() => setExpandedType(isExpanded ? null : tpl.type)}
              className="w-full flex items-center justify-between p-grid-2 text-left hover:bg-background/50 transition-colors"
            >
              <div className="flex items-center gap-2">
                <h2 className="font-medium">{TYPE_LABELS[tpl.type]}</h2>
                {isCustomized && (
                  <span className="text-xs font-medium bg-primary/10 text-primary px-1.5 py-0.5 rounded">
                    Customized
                  </span>
                )}
              </div>
              <span className="text-text-muted text-sm">{isExpanded ? "−" : "+"}</span>
            </button>

            {isExpanded && (
              <div className="border-t border-border p-grid-2 space-y-4">
                {/* Variable chips */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Available variables (click to insert)
                  </label>
                  <div className="flex flex-wrap gap-1">
                    {tpl.variables.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => insertVariable(tpl.type, v)}
                        className="text-xs font-mono bg-background border border-border rounded px-1.5 py-0.5 hover:bg-primary/10 hover:border-primary/30 transition-colors"
                      >
                        {`{{${v}}}`}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Email subject */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Email Subject
                  </label>
                  <input
                    type="text"
                    value={edit.emailSubject}
                    data-field-key="emailSubject"
                    onChange={(e) => updateEdit(tpl.type, "emailSubject", e.target.value)}
                    onFocus={(e) => { focusedFieldRef.current = e.target; }}
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30"
                  />
                </div>

                {/* Email body */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    Email Body
                  </label>
                  <textarea
                    value={edit.emailBody}
                    data-field-key="emailBody"
                    onChange={(e) => updateEdit(tpl.type, "emailBody", e.target.value)}
                    onFocus={(e) => { focusedFieldRef.current = e.target; }}
                    rows={8}
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                </div>

                {/* SMS body */}
                <div>
                  <label className="block text-xs font-medium text-text-muted mb-1">
                    SMS Body
                  </label>
                  <textarea
                    value={edit.smsBody}
                    data-field-key="smsBody"
                    onChange={(e) => updateEdit(tpl.type, "smsBody", e.target.value)}
                    onFocus={(e) => { focusedFieldRef.current = e.target; }}
                    rows={3}
                    className="w-full rounded-button border border-border bg-background px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-primary/30 resize-y"
                  />
                </div>

                {/* Actions row */}
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={() => handlePreview(tpl.type)}
                    className="text-sm font-medium border border-border rounded-button px-3 py-1.5 hover:bg-background transition-colors"
                  >
                    Preview
                  </button>
                  <button
                    type="button"
                    onClick={() => resetToDefault(tpl.type)}
                    className="text-sm font-medium text-text-muted hover:text-text-secondary transition-colors px-3 py-1.5"
                  >
                    Reset to Default
                  </button>
                </div>
              </div>
            )}
          </div>
        );
      })}

      {/* Preview modal */}
      {preview && previewType && (
        <div className="fixed inset-0 bg-black/40 z-50 flex items-center justify-center p-4">
          <div className="bg-surface rounded-card shadow-card max-w-lg w-full max-h-[80vh] overflow-y-auto p-grid-2">
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-semibold text-lg">
                Preview: {TYPE_LABELS[previewType]}
              </h2>
              <button
                onClick={() => { setPreview(null); setPreviewType(null); }}
                className="text-text-muted hover:text-text-secondary text-lg"
              >
                &times;
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Email Subject</label>
                <p className="text-sm bg-background rounded p-2 border border-border">
                  {preview.emailSubject}
                </p>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">Email Body</label>
                <pre className="text-sm bg-background rounded p-2 border border-border whitespace-pre-wrap font-sans">
                  {preview.emailBody}
                </pre>
              </div>

              <div>
                <label className="block text-xs font-medium text-text-muted mb-1">SMS</label>
                <p className="text-sm bg-background rounded p-2 border border-border">
                  {preview.smsBody}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-text-primary text-white text-sm font-medium px-4 py-2 rounded-button shadow-lg z-50">
          {toast}
        </div>
      )}
    </div>
  );
}
