"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Star } from "lucide-react";
import { Heading } from "@/components/ui/Heading";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";

export default function FeedbackPage(): React.JSX.Element {
  const params = useParams<{ slug: string; appointmentId: string }>();
  const { appointmentId } = params;

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
      setErrorMsg("Network error. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50">
        <div className="h-5 w-32 skeleton-shimmer rounded-md" />
      </main>
    );
  }

  if (errorMsg && !appointment) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50">
        <p className="text-sm font-sans text-error">{errorMsg}</p>
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
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="max-w-md text-center space-y-3">
          <Heading variant="h2">Thank you</Heading>
          <p className="font-sans text-base text-ink-500">
            Your feedback has been sent to {appointment.provider.businessName}.
          </p>
        </div>
      </main>
    );
  }

  if (alreadySubmitted) {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="max-w-md text-center space-y-3">
          <Heading variant="h2">Feedback already submitted</Heading>
          <p className="font-sans text-base text-ink-500">
            You've already left feedback for this appointment. Thank you.
          </p>
        </div>
      </main>
    );
  }

  if (appointment.status !== "COMPLETED") {
    return (
      <main className="min-h-screen flex items-center justify-center bg-cream-50 px-6">
        <div className="max-w-md text-center space-y-3">
          <Heading variant="h2">Feedback not available</Heading>
          <p className="font-sans text-base text-ink-500">
            Feedback can only be left after an appointment is completed.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-lg mx-auto px-6 py-12 space-y-8">
        <header className="space-y-1">
          <Heading variant="display" className="text-3xl sm:text-4xl">Leave feedback</Heading>
          <p className="font-sans text-base text-ink-500">
            {appointment.service.name} with {appointment.provider.businessName}
          </p>
          <p className="font-sans text-sm text-ink-500">{dateStr}</p>
        </header>

        <Card padding="lg">
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Star rating (optional) */}
            <div className="space-y-2">
              <label className="block text-sm font-sans font-medium text-ink-700">
                Rating <span className="font-normal text-ink-500">(optional)</span>
              </label>
              <div className="flex gap-1">
                {[1, 2, 3, 4, 5].map((star) => {
                  const active = rating !== null && star <= rating;
                  return (
                    <button
                      key={star}
                      type="button"
                      onClick={() => setRating(rating === star ? null : star)}
                      aria-label={`${star} star${star !== 1 ? "s" : ""}`}
                      className="p-1 transition-transform hover:scale-110"
                    >
                      <Star
                        size={28}
                        className={
                          active
                            ? "fill-rust-500 text-rust-500"
                            : "text-ink-200 hover:text-rust-400"
                        }
                      />
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-1.5">
              <label
                htmlFor="feedback-body"
                className="block text-sm font-sans font-medium text-ink-700"
              >
                Your feedback
              </label>
              <textarea
                id="feedback-body"
                value={body}
                onChange={(e) => setBody(e.target.value)}
                placeholder="Tell us about your experience…"
                rows={5}
                maxLength={2000}
                required
                className="w-full px-4 py-3 text-base font-sans text-ink-900 bg-cream-50 border border-ink-300 rounded-md placeholder:text-ink-300 hover:border-ink-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50 resize-none"
              />
              <p className="text-xs font-sans text-ink-500 text-right">{body.length}/2000</p>
            </div>

            {errorMsg && <p className="text-sm font-sans text-error">{errorMsg}</p>}

            <Button
              type="submit"
              variant="primary"
              size="md"
              disabled={submitting || !body.trim()}
              className="w-full"
            >
              {submitting ? "Submitting…" : "Submit feedback"}
            </Button>

            <p className="text-xs font-sans text-ink-500 text-center">
              Your feedback is anonymous and sent directly to the provider.
            </p>
          </form>
        </Card>
      </div>
    </main>
  );
}
