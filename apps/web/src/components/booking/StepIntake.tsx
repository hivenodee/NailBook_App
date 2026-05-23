"use client";

import * as React from "react";
import { cn } from "@/lib/cn";
import type { IntakeQuestionData } from "./types";

export type StepIntakeProps = {
  questions: IntakeQuestionData[];
  responses: Record<string, string>;
  setResponses: React.Dispatch<React.SetStateAction<Record<string, string>>>;
};

export function StepIntake({
  questions,
  responses,
  setResponses,
}: StepIntakeProps): React.JSX.Element {
  return (
    <div className="space-y-7">
      {questions.map((q) => (
        <div key={q.id} className="space-y-2">
          <label
            htmlFor={`q-${q.id}`}
            className="font-sans text-sm font-medium text-ink-700"
          >
            {q.label}
            {q.isRequired && (
              <span className="ml-1 text-rust-500" aria-hidden="true">
                *
              </span>
            )}
          </label>

          {q.type === "TEXT" && (
            <textarea
              id={`q-${q.id}`}
              value={responses[q.id] || ""}
              onChange={(e) =>
                setResponses((prev) => ({ ...prev, [q.id]: e.target.value }))
              }
              rows={3}
              className={cn(
                "w-full rounded-md border border-ink-300 bg-cream-50 px-4 py-3",
                "font-sans text-base text-ink-900 placeholder:text-ink-300",
                "transition-colors duration-200 hover:border-ink-500",
                "focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                "resize-none",
              )}
            />
          )}

          {q.type === "SELECT" && q.options && (
            <div className="space-y-2">
              {(q.options as string[]).map((opt) => {
                const checked = responses[q.id] === opt;
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() =>
                      setResponses((prev) => ({ ...prev, [q.id]: opt }))
                    }
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                      checked
                        ? "border-rust-500 bg-rust-500/5"
                        : "border-ink-200 bg-cream-50 hover:border-ink-300",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-pill border",
                        checked ? "border-rust-500" : "border-ink-300",
                      )}
                    >
                      {checked && (
                        <span className="h-2 w-2 rounded-pill bg-rust-500" />
                      )}
                    </span>
                    <span className="font-sans text-sm text-ink-900">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}

          {q.type === "CHECKBOX" && q.options && (
            <div className="space-y-2">
              {(q.options as string[]).map((opt) => {
                const current = responses[q.id]
                  ? (JSON.parse(responses[q.id]) as string[])
                  : [];
                const checked = current.includes(opt);
                return (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => {
                      const next = checked
                        ? current.filter((v) => v !== opt)
                        : [...current, opt];
                      setResponses((prev) => ({
                        ...prev,
                        [q.id]: JSON.stringify(next),
                      }));
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 rounded-md border px-4 py-3 text-left transition-all duration-200",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                      checked
                        ? "border-rust-500 bg-rust-500/5"
                        : "border-ink-200 bg-cream-50 hover:border-ink-300",
                    )}
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "flex h-4 w-4 shrink-0 items-center justify-center rounded-sm border",
                        checked
                          ? "border-rust-500 bg-rust-500"
                          : "border-ink-300",
                      )}
                    >
                      {checked && (
                        <svg
                          className="h-3 w-3 text-cream-50"
                          fill="none"
                          viewBox="0 0 24 24"
                          stroke="currentColor"
                          strokeWidth={3}
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            d="M5 13l4 4L19 7"
                          />
                        </svg>
                      )}
                    </span>
                    <span className="font-sans text-sm text-ink-900">{opt}</span>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
