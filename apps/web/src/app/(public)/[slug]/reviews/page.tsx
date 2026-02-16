import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";

type Props = {
  params: Promise<{ slug: string }>;
};

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
    <main className="min-h-screen bg-background">
      <div className="max-w-lg mx-auto px-grid-2 py-grid-3 space-y-grid-3">
        <section className="space-y-grid-1">
          <h1 className="text-2xl font-semibold">Reviews</h1>
          <p className="text-text-secondary">{provider.businessName}</p>
        </section>

        {reviews.length > 0 ? (
          <>
            {/* Aggregate stats */}
            <section className="bg-surface rounded-card p-grid-2 shadow-card flex items-center gap-grid-2">
              {avgRating !== null && (
                <div className="text-3xl font-bold">{avgRating}</div>
              )}
              <div>
                {avgRating !== null && (
                  <div className="flex gap-0.5 text-yellow-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <span key={s} className={s <= Math.round(avgRating) ? "text-yellow-400" : "text-border"}>
                        ★
                      </span>
                    ))}
                  </div>
                )}
                <p className="text-sm text-text-muted">
                  {reviews.length} review{reviews.length !== 1 ? "s" : ""}
                </p>
              </div>
            </section>

            {/* Review list */}
            <section className="space-y-grid-2">
              {reviews.map((review) => (
                <div key={review.id} className="bg-surface rounded-card p-grid-2 shadow-card space-y-1">
                  {review.rating !== null && (
                    <div className="flex gap-0.5 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= review.rating! ? "text-yellow-400" : "text-border"}>
                          ★
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-sm">{review.body}</p>
                  <div className="flex gap-2 text-xs text-text-muted">
                    <span>{review.appointment.service.name}</span>
                    <span>·</span>
                    <span>
                      {new Date(review.createdAt).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </span>
                  </div>
                </div>
              ))}
            </section>
          </>
        ) : (
          <div className="border-2 border-dashed border-border rounded-card p-grid-3 text-center">
            <p className="text-text-muted text-sm">No reviews yet</p>
          </div>
        )}
      </div>
    </main>
  );
}
