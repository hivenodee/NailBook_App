import React from "react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Star } from "lucide-react";
import { prisma } from "@/lib/db";
import { Heading } from "@/components/ui/Heading";
import { Card } from "@/components/ui/Card";

type Props = {
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: { businessName: true },
  });
  if (!provider) return { title: "Not found" };
  return {
    title: `Reviews · ${provider.businessName}`,
    description: `What clients are saying about ${provider.businessName}.`,
  };
}

export default async function PublicReviewsPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;

  const provider = await prisma.provider.findUnique({
    where: { slug },
    select: { id: true, businessName: true, timezone: true },
  });
  if (!provider) notFound();

  const reviews = await prisma.feedback.findMany({
    where: { providerId: provider.id, isPublic: true },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      rating: true,
      body: true,
      createdAt: true,
      appointment: {
        select: { service: { select: { name: true } } },
      },
    },
  });

  const rated = reviews.filter((r) => r.rating !== null);
  const avgRating =
    rated.length > 0
      ? Math.round((rated.reduce((s, r) => s + r.rating!, 0) / rated.length) * 10) / 10
      : null;

  return (
    <main className="min-h-screen bg-cream-50">
      <div className="max-w-xl mx-auto px-6 py-12 space-y-8">
        <header className="space-y-1">
          <Heading variant="display" className="text-3xl sm:text-4xl">Reviews</Heading>
          <p className="font-sans text-base text-ink-500">{provider.businessName}</p>
        </header>

        {reviews.length > 0 ? (
          <>
            {/* Aggregate stats */}
            <Card padding="lg" className="flex items-center gap-5">
              {avgRating !== null && (
                <p className="font-display text-5xl text-ink-900 leading-none">{avgRating}</p>
              )}
              <div className="space-y-1">
                {avgRating !== null && (
                  <Stars value={Math.round(avgRating)} size={16} />
                )}
                <p className="font-sans text-sm text-ink-500">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              </div>
            </Card>

            {/* Review list */}
            <section className="space-y-4">
              {reviews.map((review) => (
                <Card key={review.id} padding="lg" className="space-y-3">
                  {review.rating !== null && <Stars value={review.rating} size={14} />}
                  <p className="font-sans text-base text-ink-900 leading-relaxed">
                    {review.body}
                  </p>
                  <div className="flex gap-2 text-xs font-sans text-ink-500">
                    <span>{review.appointment.service.name}</span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </Card>
              ))}
            </section>
          </>
        ) : (
          <Card padding="lg" className="border-dashed">
            <p className="text-center text-sm font-sans text-ink-500">No reviews yet.</p>
          </Card>
        )}
      </div>
    </main>
  );
}

function Stars({ value, size = 14 }: { value: number; size?: number }): React.JSX.Element {
  return (
    <div className="flex gap-0.5" aria-label={`${value} out of 5`}>
      {[1, 2, 3, 4, 5].map((s) => (
        <Star
          key={s}
          size={size}
          aria-hidden="true"
          className={s <= value ? "fill-rust-500 text-rust-500" : "text-ink-200"}
        />
      ))}
    </div>
  );
}
