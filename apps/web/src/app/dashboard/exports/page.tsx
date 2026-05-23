"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

type ExportType = "APPOINTMENTS" | "CLIENTS" | "TRANSACTIONS";
type DatePreset = "7d" | "30d" | "90d" | "custom";
type ActiveTab = "import" | "export";

type ExportJob = {
  id: string;
  type: ExportType;
  status: "PENDING" | "PROCESSING" | "COMPLETED" | "FAILED";
  error: string | null;
  startDate: string | null;
  endDate: string | null;
  createdAt: string;
  completedAt: string | null;
};

type ImportResult = {
  total: number;
  created: number;
  updated: number;
  skipped: number;
};

const TYPE_LABELS: Record<ExportType, string> = {
  APPOINTMENTS: "Appointments",
  CLIENTS: "Clients",
  TRANSACTIONS: "Transactions",
};

const PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  "90d": "Last 90 days",
  custom: "Custom",
};

function getPresetDates(preset: DatePreset): { startDate: string; endDate: string } {
  const end = new Date();
  const start = new Date();
  switch (preset) {
    case "7d":
      start.setDate(start.getDate() - 7);
      break;
    case "30d":
      start.setDate(start.getDate() - 30);
      break;
    case "90d":
      start.setDate(start.getDate() - 90);
      break;
    default:
      break;
  }
  return {
    startDate: start.toISOString().split("T")[0],
    endDate: end.toISOString().split("T")[0],
  };
}

export default function ImportExportPage(): React.JSX.Element {
  const [activeTab, setActiveTab] = useState<ActiveTab>("import");

  // Export state
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [exportType, setExportType] = useState<ExportType>("APPOINTMENTS");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

  // Import state
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState<ImportResult | null>(null);
  const [importError, setImportError] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);

  const loadJobs = useCallback(async () => {
    try {
      const res = await fetch("/api/exports");
      const json = await res.json();
      setJobs(json.data || []);
    } catch (e) {
      console.error("Failed to load exports:", e);
    }
  }, []);

  useEffect(() => {
    loadJobs().finally(() => setLoading(false));
  }, [loadJobs]);

  useEffect(() => {
    const hasPending = jobs.some(
      (j) => j.status === "PENDING" || j.status === "PROCESSING",
    );
    if (!hasPending) return;
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, loadJobs]);

  async function handleGenerate() {
    setGenerating(true);
    try {
      let startDate: string | undefined;
      let endDate: string | undefined;

      if (datePreset === "custom") {
        startDate = customStart || undefined;
        endDate = customEnd ? customEnd + "T23:59:59.999Z" : undefined;
      } else {
        const dates = getPresetDates(datePreset);
        startDate = dates.startDate;
        endDate = dates.endDate + "T23:59:59.999Z";
      }

      await fetch("/api/exports", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: exportType, startDate, endDate }),
      });
      await loadJobs();
    } catch (e) {
      console.error("Failed to generate export:", e);
    } finally {
      setGenerating(false);
    }
  }

  function formatDateRange(job: ExportJob): string {
    if (!job.startDate && !job.endDate) return "All time";
    const fmt = (d: string) => new Date(d).toLocaleDateString();
    if (job.startDate && job.endDate) return `${fmt(job.startDate)} – ${fmt(job.endDate)}`;
    if (job.startDate) return `From ${fmt(job.startDate)}`;
    return `Until ${fmt(job.endDate!)}`;
  }

  function handleFileSelect(file: File | null) {
    if (!file) return;
    if (!file.name.endsWith(".csv")) {
      setImportError("Please upload a CSV file");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setImportError("File too large (max 5MB)");
      return;
    }
    setSelectedFile(file);
    setImportError("");
    setImportResult(null);
  }

  async function handleImport() {
    if (!selectedFile) return;
    setImporting(true);
    setImportError("");
    setImportResult(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);

      const res = await fetch("/api/imports/clients", {
        method: "POST",
        body: formData,
      });
      const json = await res.json();

      if (!res.ok) {
        setImportError(json.error?.message || "Import failed");
        return;
      }
      setImportResult(json.data);
      setSelectedFile(null);
      if (fileInputRef.current) fileInputRef.current.value = "";
    } catch {
      setImportError("Network error");
    } finally {
      setImporting(false);
    }
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    handleFileSelect(file);
  }

  if (loading) {
    return (
      <div className="max-w-3xl space-y-8">
        <div className="space-y-3">
          <div className="h-12 w-48 skeleton-shimmer rounded-md" />
          <div className="h-5 w-72 skeleton-shimmer rounded-md" />
        </div>
        <div className="h-10 w-48 skeleton-shimmer rounded-md" />
        <div className="h-64 skeleton-shimmer rounded-md" />
      </div>
    );
  }

  return (
    <div className="max-w-3xl space-y-8">
      <header className="space-y-2">
        <Heading variant="display" className="text-3xl sm:text-4xl">Import & export</Heading>
        <p className="text-base font-sans text-ink-500 max-w-xl">
          Bring in your clients from another platform, or download your data as CSV.
        </p>
      </header>

      {/* Tabs */}
      <div className="inline-flex items-center gap-2 border-b border-ink-200">
        <TabButton
          active={activeTab === "import"}
          onClick={() => setActiveTab("import")}
          icon={<Upload size={14} aria-hidden="true" />}
          label="Import"
        />
        <TabButton
          active={activeTab === "export"}
          onClick={() => setActiveTab("export")}
          icon={<Download size={14} aria-hidden="true" />}
          label="Export"
        />
      </div>

      {/* ─── Import Tab ─────────────────────────────────── */}
      {activeTab === "import" && (
        <Card padding="lg" className="space-y-5">
          <div>
            <Heading variant="h4" className="text-lg">Import clients</Heading>
            <p className="text-sm font-sans text-ink-500 mt-1">
              Upload a CSV file with your client data. We'll match by email to avoid duplicates.
            </p>
          </div>

          {/* Expected format */}
          <div className="rounded-md border border-ink-200 bg-cream-100 p-4 space-y-2">
            <p className="text-xs font-sans font-medium tracking-wide uppercase text-ink-500">
              Expected CSV columns
            </p>
            <div className="flex flex-wrap gap-1.5">
              <span className="rounded-pill bg-rust-500 text-cream-50 border border-rust-500 px-2.5 py-0.5 text-xs font-sans font-medium">
                email *
              </span>
              <span className="rounded-pill bg-cream-50 text-ink-700 border border-ink-200 px-2.5 py-0.5 text-xs font-sans">
                name
              </span>
              <span className="rounded-pill bg-cream-50 text-ink-700 border border-ink-200 px-2.5 py-0.5 text-xs font-sans">
                phone
              </span>
              <span className="rounded-pill bg-cream-50 text-ink-700 border border-ink-200 px-2.5 py-0.5 text-xs font-sans">
                notes
              </span>
            </div>
            <p className="text-xs font-sans text-ink-500">
              Works with exports from Square, Acuity, Vagaro, GlossGenius, and most booking platforms.
            </p>
          </div>

          {/* Drop zone */}
          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={
              "border-2 border-dashed rounded-md p-10 text-center cursor-pointer transition-colors " +
              (dragOver
                ? "border-rust-500 bg-rust-500/5"
                : selectedFile
                  ? "border-rust-500/50 bg-cream-100"
                  : "border-ink-200 hover:border-ink-500 hover:bg-cream-100")
            }
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              className="hidden"
              onChange={(e) => handleFileSelect(e.target.files?.[0] || null)}
            />
            {selectedFile ? (
              <div className="flex items-center justify-center gap-2">
                <FileText size={20} className="text-rust-500" aria-hidden="true" />
                <span className="text-sm font-sans font-medium text-ink-900">
                  {selectedFile.name}
                </span>
                <span className="text-xs font-sans text-ink-500">
                  ({(selectedFile.size / 1024).toFixed(1)} KB)
                </span>
              </div>
            ) : (
              <div>
                <Upload size={24} className="mx-auto mb-3 text-ink-500" aria-hidden="true" />
                <p className="text-sm font-sans text-ink-700">
                  Drop a CSV file here or click to browse
                </p>
                <p className="text-xs font-sans text-ink-500 mt-1">
                  Max 5MB, up to 5,000 clients
                </p>
              </div>
            )}
          </div>

          {importError && (
            <div className="flex items-start gap-2">
              <AlertCircle size={16} className="text-error mt-0.5 shrink-0" aria-hidden="true" />
              <p className="text-sm font-sans text-error">{importError}</p>
            </div>
          )}

          {importResult && (
            <div className="rounded-md border border-success/30 bg-success/10 p-4 flex items-start gap-2">
              <CheckCircle2 size={16} className="text-success mt-0.5 shrink-0" aria-hidden="true" />
              <div className="text-sm font-sans">
                <p className="font-medium text-success">Import complete</p>
                <p className="mt-0.5 text-ink-700">
                  {importResult.total} rows processed: {importResult.created} created,{" "}
                  {importResult.updated} updated, {importResult.skipped} skipped
                </p>
              </div>
            </div>
          )}

          <Button
            variant="primary"
            size="md"
            onClick={handleImport}
            disabled={!selectedFile || importing}
          >
            {importing ? "Importing…" : "Import clients"}
          </Button>
        </Card>
      )}

      {/* ─── Export Tab ─────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="space-y-6">
          <Card padding="lg" className="space-y-5">
            <Heading variant="h4" className="text-lg">Request export</Heading>

            <div className="space-y-2">
              <p className="text-sm font-sans font-medium text-ink-700">Type</p>
              <ChipRow
                options={(Object.keys(TYPE_LABELS) as ExportType[]).map((t) => ({
                  key: t,
                  label: TYPE_LABELS[t],
                }))}
                selected={exportType}
                onSelect={(v) => setExportType(v as ExportType)}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-sans font-medium text-ink-700">Date range</p>
              <ChipRow
                options={(Object.keys(PRESET_LABELS) as DatePreset[]).map((p) => ({
                  key: p,
                  label: PRESET_LABELS[p],
                }))}
                selected={datePreset}
                onSelect={(v) => setDatePreset(v as DatePreset)}
              />
            </div>

            {datePreset === "custom" && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <label htmlFor="from" className="block text-sm font-sans font-medium text-ink-700">
                    From
                  </label>
                  <input
                    id="from"
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                  />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="to" className="block text-sm font-sans font-medium text-ink-700">
                    To
                  </label>
                  <input
                    id="to"
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full h-11 px-4 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
                  />
                </div>
              </div>
            )}

            <Button variant="primary" size="md" onClick={handleGenerate} disabled={generating}>
              {generating ? "Generating…" : "Generate export"}
            </Button>
          </Card>

          {/* Recent Exports list */}
          <section className="space-y-3">
            <Heading variant="h4" className="text-lg">Recent exports</Heading>

            {jobs.length === 0 ? (
              <Card padding="lg" className="border-dashed">
                <p className="text-center text-sm font-sans text-ink-500">
                  No exports yet. Generate your first export above.
                </p>
              </Card>
            ) : (
              <div className="space-y-2">
                {jobs.map((job) => (
                  <Card key={job.id} padding="md">
                    <div className="flex justify-between items-start gap-4">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <span className="font-sans font-medium text-sm text-ink-900">
                            {TYPE_LABELS[job.type]}
                          </span>
                          <ExportStatusBadge status={job.status} />
                        </div>
                        <div className="flex flex-wrap gap-3 mt-1 text-xs font-sans text-ink-500">
                          <span>{formatDateRange(job)}</span>
                          <span>Created {new Date(job.createdAt).toLocaleString()}</span>
                        </div>
                        {job.status === "FAILED" && job.error && (
                          <p className="text-sm font-sans text-error mt-1.5">
                            {job.error.length > 100
                              ? job.error.slice(0, 100) + "…"
                              : job.error}
                          </p>
                        )}
                      </div>
                      {job.status === "COMPLETED" && (
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() =>
                            window.open(`/api/exports/${job.id}/download`, "_blank")
                          }
                        >
                          Download
                        </Button>
                      )}
                      {(job.status === "PENDING" || job.status === "PROCESSING") && (
                        <span className="text-xs font-sans text-ink-500 shrink-0">
                          Generating…
                        </span>
                      )}
                    </div>
                  </Card>
                ))}
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

function TabButton({
  active,
  onClick,
  icon,
  label,
}: {
  active: boolean;
  onClick: () => void;
  icon: React.ReactNode;
  label: string;
}): React.JSX.Element {
  return (
    <button
      onClick={onClick}
      className={
        "flex items-center gap-1.5 px-4 py-2 -mb-px text-sm font-sans font-medium border-b-2 transition-colors " +
        (active
          ? "border-rust-500 text-ink-900"
          : "border-transparent text-ink-500 hover:text-ink-700")
      }
    >
      {icon}
      {label}
    </button>
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
              "rounded-pill px-4 py-1.5 text-sm font-sans font-medium border transition-colors " +
              (active
                ? "bg-rust-500 text-cream-50 border-rust-500"
                : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-500")
            }
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function ExportStatusBadge({ status }: { status: ExportJob["status"] }): React.JSX.Element {
  const variant: Record<ExportJob["status"], "verified" | "warning" | "error" | "neutral"> = {
    COMPLETED: "verified",
    PENDING: "warning",
    PROCESSING: "warning",
    FAILED: "error",
  };
  const labels: Record<ExportJob["status"], string> = {
    COMPLETED: "Completed",
    PENDING: "Pending",
    PROCESSING: "Processing",
    FAILED: "Failed",
  };
  return <Badge variant={variant[status]}>{labels[status]}</Badge>;
}
