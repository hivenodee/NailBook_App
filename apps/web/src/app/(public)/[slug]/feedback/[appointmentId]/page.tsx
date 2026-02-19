"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";

export default function FeedbackPage(): React.JSX.Element {
  const params = useParams<{ slug: string; appointmentId: string }>();
  const { slug, appointmentId } = params;

  const [appointment, setAppointment] = useState<{
    service: { name: string };
    provider: { businessName: string; timezone: string };
    startTime: string;
    status: string;
    feedback?: { id: string } | null;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [alreadySubmitted, setAlreadySubmitted] = useState(false);
  const [rating, setRating] = useState<number | null>(null);
  const [body, setBody] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  useEffect(() => {
    fetch(`/api/appointments/${appointmentId}`)
      .then((r) => r.json())
      .then((res) => {
        if (res.data) {
          setAppointment(res.data);
          if (res.data.feedback) setAlreadySubmitted(true);
        } else {
          setErrorMsg("Appointment not found");
        }
      })
      .catch(() => setErrorMsg("Failed to load appointment"))
      .finally(() => setLoading(false));
  }, [appointmentId]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!body.trim()) return;
    setSubmitting(true);
    setErrorMsg("");

    try {
      const res = await fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          appointmentId,
          rating: rating ?? undefined,
          body: body.trim(),
        }),
      });
      const json = await res.json();
      if (res.ok) {
        setSubmitted(true);
      } else if (res.status === 409) {
        setAlreadySubmitted(true);
      } else {
        setErrorMsg(json.error?.message || "Something went wrong");
      }
    } catch {
      setErrorMsg("Network error — please try again");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-text-muted">Loading...</p>
      </main>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <main className="min-h-screen bg-background flex items-center justify-center">
        <p className="text-red-600">{errorMsg}</p>
      </main>
    );
  }

  if (!appointment) return <></>;

  const dateStr = new Date(appointment.startTime).toLocaleDateString("en-US", {
    weekday: "long",
    month: "long",
    day: "numeric",
    timeZone: appointment.provider.timezone || "America/New_York",
  });

  if (submitted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-grid-2 py-grid-3 text-center space-y-grid-2">
          <h1 className="font-display text-2xl">Thank you for your feedback!</h1>
          <p className="text-text-secondary">
            Your feedback has been sent to {appointment.provider.businessName}.
          </p>
        </div>
      </main>
    );
  }

  if (alreadySubmitted) {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-grid-2 py-grid-3 text-center space-y-grid-2">
          <h1 className="font-display text-2xl">Feedback Already Submitted</h1>
          <p className="text-text-secondary">
            You&apos;ve already left feedback for this appointment. Thank you!
          </p>
        </div>
      </main>
    );
  }

  if (appointment.status !== "COMPLETED") {
    return (
      <main className="min-h-screen bg-background">
        <div className="max-w-lg mx-auto px-grid-2 py-grid-3 text-center space-y-grid-2">
          <h1 className="font-display text-2xl">Feedback Not Available</h1>
          <p className="text-text-secondary">
            Feedback can only be left after an appointment is completed.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-grid-2 py-grid-3 space-y-grid-3">
        <section className="space-y-grid-1">
          <h1 className="font-display text-2xl">Leave Feedback</h1>
          <p className="text-text-secondary">
            {appointment.service.name} with {appointment.provider.businessName}
          </p>
          <p className="text-text-muted text-sm">{dateStr}</p>
        </section>

        <form onSubmit={handleSubmit} className="space-y-grid-2">
          {/* Star rating (optional) */}
          <div>
            <label className="block text-sm font-medium mb-1">
              Rating <span className="text-text-muted">(optional)</span>
            </label>
            <div className="flex gap-1">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  type="button"
                  onClick={() => setRating(rating === star ? null : star)}
                  className={`text-2xl transition-colors ${
                    rating !== null && star <= rating
                      ? "text-yellow-400"
                      : "text-border hover:text-yellow-300"
                  }`}
                >
                  ★
                </button>
              ))}
            </div>
          </div>

          {/* Text area */}
          <div>
            <label htmlFor="feedback-body" className="block text-sm font-medium mb-1">
              Your feedback
            </label>
            <textarea
              id="feedback-body"
              value={body}
              onChange={(e) => setBody(e.target.value)}
              placeholder="Tell us about your experience..."
              rows={4}
              maxLength={2000}
              required
              className="w-full rounded-card border border-border bg-surface px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary resize-none"
            />
            <p className="text-xs text-text-muted mt-0.5">{body.length}/2000</p>
          </div>

          {errorMsg && (
            <p className="text-sm text-red-600">{errorMsg}</p>
          )}

          <button
            type="submit"
            disabled={submitting || !body.trim()}
            className="w-full bg-primary text-white py-2.5 rounded-card text-sm font-medium hover:bg-primary-dark disabled:opacity-50 transition-colors"
          >
            {submitting ? "Submitting..." : "Submit Feedback"}
          </button>

          <p className="text-xs text-text-muted text-center">
            Your feedback is anonymous and sent directly to the provider.
          </p>
        </form>
      </div>
    </main>
  );
}
