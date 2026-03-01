"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { Upload, Download, FileText, AlertCircle, CheckCircle2 } from "lucide-react";

// ─── Types ───────────────────────────────────────────────

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

// ─── Constants ───────────────────────────────────────────

const TYPE_LABELS: Record<ExportType, string> = {
  APPOINTMENTS: "Appointments",
  CLIENTS: "Clients",
  TRANSACTIONS: "Transactions",
};

const PRESET_LABELS: Record<DatePreset, string> = {
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  "90d": "Last 90 Days",
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

// ─── Component ───────────────────────────────────────────

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

  // Auto-poll while any job is pending/processing
  useEffect(() => {
    const hasPending = jobs.some(
      (j) => j.status === "PENDING" || j.status === "PROCESSING"
    );
    if (!hasPending) return;
    const interval = setInterval(loadJobs, 5000);
    return () => clearInterval(interval);
  }, [jobs, loadJobs]);

  // ─── Export handlers ─────────────────────────────────────

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
    if (job.startDate && job.endDate) return `${fmt(job.startDate)} - ${fmt(job.endDate)}`;
    if (job.startDate) return `From ${fmt(job.startDate)}`;
    return `Until ${fmt(job.endDate!)}`;
  }

  // ─── Import handlers ────────────────────────────────────

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

  // ─── Loading skeleton ────────────────────────────────────

  if (loading) {
    return (
      <div className="space-y-grid-3">
        <div className="h-7 bg-border/60 rounded w-32 skeleton-shimmer" />
        <div className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer space-y-grid-2">
          <div className="h-5 bg-border/60 rounded w-32" />
          <div className="flex gap-grid-1">
            <div className="h-7 bg-border/40 rounded-button w-28" />
            <div className="h-7 bg-border/40 rounded-button w-20" />
            <div className="h-7 bg-border/40 rounded-button w-28" />
          </div>
          <div className="flex gap-grid-1">
            <div className="h-7 bg-border/40 rounded-button w-24" />
            <div className="h-7 bg-border/40 rounded-button w-24" />
            <div className="h-7 bg-border/40 rounded-button w-24" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Import / Export</h1>

      {/* Tab toggle */}
      <div className="flex rounded-button border border-border overflow-hidden w-fit">
        <button
          onClick={() => setActiveTab("import")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors ${
            activeTab === "import"
              ? "bg-primary text-white"
              : "text-text-secondary hover:bg-surface-alt"
          }`}
        >
          <Upload size={14} />
          Import
        </button>
        <button
          onClick={() => setActiveTab("export")}
          className={`flex items-center gap-1.5 px-4 py-2 text-sm font-medium transition-colors border-l border-border ${
            activeTab === "export"
              ? "bg-primary text-white"
              : "text-text-secondary hover:bg-surface-alt"
          }`}
        >
          <Download size={14} />
          Export
        </button>
      </div>

      {/* ─── Import Tab ─────────────────────────────────── */}
      {activeTab === "import" && (
        <div className="space-y-grid-3">
          {/* Import card */}
          <div className="bg-surface rounded-card p-grid-3 shadow-card space-y-grid-2">
            <div>
              <h2 className="text-lg font-medium">Import Clients</h2>
              <p className="text-sm text-text-muted mt-1">
                Upload a CSV file with your client data from another platform. We'll match by email to avoid duplicates.
              </p>
            </div>

            {/* Expected format */}
            <div className="bg-background rounded-input p-grid-2 text-sm">
              <p className="font-medium text-text-secondary mb-1">Expected CSV columns:</p>
              <div className="flex flex-wrap gap-1.5">
                <span className="px-2 py-0.5 rounded bg-primary-light text-primary text-xs font-medium">
                  email *
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-alt text-text-secondary text-xs">
                  name
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-alt text-text-secondary text-xs">
                  phone
                </span>
                <span className="px-2 py-0.5 rounded bg-surface-alt text-text-secondary text-xs">
                  notes
                </span>
              </div>
              <p className="text-xs text-text-muted mt-1.5">
                Works with exports from Square, Acuity, Vagaro, GlossGenius, and most booking platforms.
              </p>
            </div>

            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-card p-grid-4 text-center cursor-pointer transition-colors ${
                dragOver
                  ? "border-primary bg-primary-light/30"
                  : selectedFile
                    ? "border-primary/50 bg-primary-light/10"
                    : "border-border hover:border-primary/30 hover:bg-surface-alt"
              }`}
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
                  <FileText size={20} className="text-primary" />
                  <span className="text-sm font-medium text-text-primary">{selectedFile.name}</span>
                  <span className="text-xs text-text-muted">
                    ({(selectedFile.size / 1024).toFixed(1)} KB)
                  </span>
                </div>
              ) : (
                <div>
                  <Upload size={24} className="mx-auto text-text-muted mb-2" />
                  <p className="text-sm text-text-secondary">
                    Drop a CSV file here or click to browse
                  </p>
                  <p className="text-xs text-text-muted mt-1">Max 5MB, up to 5,000 clients</p>
                </div>
              )}
            </div>

            {/* Error */}
            {importError && (
              <div className="flex items-start gap-2 text-status-error">
                <AlertCircle size={16} className="mt-0.5 shrink-0" />
                <p className="text-sm">{importError}</p>
              </div>
            )}

            {/* Success */}
            {importResult && (
              <div className="bg-status-success/10 rounded-input p-grid-2 flex items-start gap-2">
                <CheckCircle2 size={16} className="text-status-success mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-medium text-status-success">Import complete</p>
                  <p className="text-text-secondary mt-0.5">
                    {importResult.total} rows processed: {importResult.created} created, {importResult.updated} updated, {importResult.skipped} skipped
                  </p>
                </div>
              </div>
            )}

            <button
              onClick={handleImport}
              disabled={!selectedFile || importing}
              className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {importing ? "Importing..." : "Import Clients"}
            </button>
          </div>
        </div>
      )}

      {/* ─── Export Tab ─────────────────────────────────── */}
      {activeTab === "export" && (
        <div className="space-y-grid-3">
          {/* Request Export card */}
          <div className="bg-surface rounded-card p-grid-2 shadow-card space-y-grid-2">
            <h2 className="text-lg font-medium">Request Export</h2>

            {/* Type selector */}
            <div>
              <label className="block text-sm font-medium mb-1">Type</label>
              <div className="flex gap-grid-1">
                {(Object.keys(TYPE_LABELS) as ExportType[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setExportType(t)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                      exportType === t
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                    }`}
                  >
                    {TYPE_LABELS[t]}
                  </button>
                ))}
              </div>
            </div>

            {/* Date range */}
            <div>
              <label className="block text-sm font-medium mb-1">Date Range</label>
              <div className="flex gap-grid-1 flex-wrap">
                {(Object.keys(PRESET_LABELS) as DatePreset[]).map((p) => (
                  <button
                    key={p}
                    type="button"
                    onClick={() => setDatePreset(p)}
                    className={`text-xs font-medium px-3 py-1.5 rounded-button transition-colors ${
                      datePreset === p
                        ? "bg-primary text-white"
                        : "bg-background text-text-secondary border border-border hover:border-primary/30 hover:text-text-primary"
                    }`}
                  >
                    {PRESET_LABELS[p]}
                  </button>
                ))}
              </div>
            </div>

            {/* Custom date inputs */}
            {datePreset === "custom" && (
              <div className="flex gap-grid-2">
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">From</label>
                  <input
                    type="date"
                    value={customStart}
                    onChange={(e) => setCustomStart(e.target.value)}
                    className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
                <div className="flex-1">
                  <label className="block text-sm font-medium mb-1">To</label>
                  <input
                    type="date"
                    value={customEnd}
                    onChange={(e) => setCustomEnd(e.target.value)}
                    className="w-full border border-border rounded-button px-3 py-2 text-sm bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  />
                </div>
              </div>
            )}

            <button
              onClick={handleGenerate}
              disabled={generating}
              className="bg-primary text-white py-2.5 px-4 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {generating ? "Generating..." : "Generate Export"}
            </button>
          </div>

          {/* Recent Exports list */}
          <div className="space-y-grid-1">
            <h2 className="text-lg font-medium">Recent Exports</h2>

            {jobs.length === 0 ? (
              <div className="bg-surface rounded-card p-grid-2 shadow-card text-center">
                <p className="text-text-muted">No exports yet. Generate your first export above.</p>
              </div>
            ) : (
              jobs.map((job) => (
                <div
                  key={job.id}
                  className="bg-surface rounded-card p-grid-2 shadow-card"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-medium text-sm">
                          {TYPE_LABELS[job.type]}
                        </span>
                        <StatusBadge status={job.status} />
                      </div>
                      <div className="flex flex-wrap gap-3 mt-1 text-sm text-text-muted">
                        <span>{formatDateRange(job)}</span>
                        <span>
                          Created {new Date(job.createdAt).toLocaleString()}
                        </span>
                      </div>
                      {job.status === "FAILED" && job.error && (
                        <p className="text-sm text-status-error mt-1">
                          {job.error.length > 100
                            ? job.error.slice(0, 100) + "..."
                            : job.error}
                        </p>
                      )}
                    </div>
                    {job.status === "COMPLETED" && (
                      <button
                        onClick={() =>
                          window.open(`/api/exports/${job.id}/download`, "_blank")
                        }
                        className="text-xs font-medium px-3 py-1.5 rounded-button bg-status-success/10 text-status-success hover:bg-status-success/20 transition-colors"
                      >
                        Download
                      </button>
                    )}
                    {(job.status === "PENDING" || job.status === "PROCESSING") && (
                      <span className="text-xs text-text-muted">Generating...</span>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function StatusBadge({ status }: { status: ExportJob["status"] }): React.JSX.Element {
  const styles: Record<ExportJob["status"], string> = {
    COMPLETED: "bg-status-success/10 text-status-success",
    PENDING: "bg-status-warning/10 text-status-warning",
    PROCESSING: "bg-status-warning/10 text-status-warning",
    FAILED: "bg-status-error/10 text-status-error",
  };
  const labels: Record<ExportJob["status"], string> = {
    COMPLETED: "Completed",
    PENDING: "Pending",
    PROCESSING: "Processing",
    FAILED: "Failed",
  };
  return (
    <span
      className={`text-xs font-medium px-2 py-0.5 rounded-full ${styles[status]}`}
    >
      {labels[status]}
    </span>
  );
}
