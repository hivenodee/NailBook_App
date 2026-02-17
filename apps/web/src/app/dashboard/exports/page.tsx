"use client";

import React, { useEffect, useState, useCallback } from "react";

type ExportType = "APPOINTMENTS" | "CLIENTS" | "TRANSACTIONS";
type DatePreset = "7d" | "30d" | "90d" | "custom";

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

export default function ExportsPage(): React.JSX.Element {
  const [jobs, setJobs] = useState<ExportJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);

  const [exportType, setExportType] = useState<ExportType>("APPOINTMENTS");
  const [datePreset, setDatePreset] = useState<DatePreset>("30d");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");

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

  if (loading) {
    return <div className="text-text-muted text-sm">Loading...</div>;
  }

  return (
    <div className="space-y-grid-3">
      <h1 className="text-2xl font-semibold">Exports</h1>

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
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
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
                    <p className="text-sm text-red-600 mt-1">
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
                    className="text-xs font-medium px-3 py-1.5 rounded-button bg-green-100 text-green-800 hover:bg-green-200 transition-colors"
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
  );
}

function StatusBadge({ status }: { status: ExportJob["status"] }): React.JSX.Element {
  const styles: Record<ExportJob["status"], string> = {
    COMPLETED: "bg-green-100 text-green-800",
    PENDING: "bg-yellow-100 text-yellow-800",
    PROCESSING: "bg-yellow-100 text-yellow-800",
    FAILED: "bg-red-100 text-red-800",
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
