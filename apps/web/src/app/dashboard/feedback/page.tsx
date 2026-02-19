"use client";

import React, { useState, useEffect, useCallback } from "react";

type FeedbackItem = {
  id: string;
  rating: number | null;
  body: string;
  isPublic: boolean;
  createdAt: string;
  appointment: {
    startTime: string;
    service: { name: string };
  };
};

type Filter = "all" | "public" | "private";

export default function DashboardFeedbackPage(): React.JSX.Element {
  const [items, setItems] = useState<FeedbackItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>("all");
  const [toggling, setToggling] = useState<string | null>(null);

  const load = useCallback(async () => {
    setLoading(true);
    const params = new URLSearchParams();
    if (filter === "public") params.set("public", "true");
    if (filter === "private") params.set("public", "false");
    const res = await fetch(`/api/feedback?${params.toString()}`);
    const json = await res.json();
    if (json.data) setItems(json.data.items);
    setLoading(false);
  }, [filter]);

  useEffect(() => { load(); }, [load]);

  async function togglePublic(id: string, isPublic: boolean) {
    setToggling(id);
    try {
      const res = await fetch(`/api/feedback/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isPublic }),
      });
      if (res.ok) {
        setItems((prev) =>
          prev.map((item) => (item.id === id ? { ...item, isPublic } : item))
        );
      }
    } finally {
      setToggling(null);
    }
  }

  const filterButtons: { label: string; value: Filter }[] = [
    { label: "All", value: "all" },
    { label: "Public", value: "public" },
    { label: "Private", value: "private" },
  ];

  return (
    <div className="space-y-grid-3">
      <h1 className="font-display text-2xl">Feedback</h1>

      {/* Filter tabs */}
      <div className="flex gap-1 bg-border/30 rounded-card p-0.5 w-fit">
        {filterButtons.map((btn) => (
          <button
            key={btn.value}
            onClick={() => setFilter(btn.value)}
            className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
              filter === btn.value
                ? "bg-surface shadow-sm text-text-primary"
                : "text-text-muted hover:text-text-secondary"
            }`}
          >
            {btn.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="space-y-grid-1">
          {[1, 2, 3].map((i) => (
            <div key={i} className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer h-28" />
          ))}
        </div>
      ) : items.length === 0 ? (
        <div className="border-2 border-dashed border-border rounded-card p-grid-3 text-center">
          <p className="text-text-muted text-sm">
            {filter === "all" ? "No feedback received yet" : `No ${filter} feedback`}
          </p>
        </div>
      ) : (
        <div className="space-y-grid-1">
          {items.map((item) => (
            <div key={item.id} className="bg-surface rounded-card p-grid-2 shadow-card space-y-2">
              <div className="flex items-start justify-between gap-2">
                <div className="space-y-1 flex-1 min-w-0">
                  {item.rating !== null && (
                    <div className="flex gap-0.5 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= item.rating! ? "text-yellow-400" : "text-border"}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm">{item.body}</p>
                  <div className="flex gap-2 text-xs text-text-muted">
                    <span>{item.appointment.service.name}</span>
                    <span>·</span>
                    <span>
                      {new Date(item.appointment.startTime).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
                <button
                  onClick={() => togglePublic(item.id, !item.isPublic)}
                  disabled={toggling === item.id}
                  className={`shrink-0 px-3 py-1.5 rounded text-xs font-medium transition-colors ${
                    item.isPublic
                      ? "bg-green-50 text-green-700 hover:bg-green-100"
                      : "bg-background text-text-muted hover:bg-border/30"
                  } disabled:opacity-50`}
                >
                  {item.isPublic ? "Public" : "Make Public"}
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
