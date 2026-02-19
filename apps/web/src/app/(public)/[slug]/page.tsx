import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import ServiceList from "@/components/ServiceList";

type Props = {
  params: Promise<{ slug: string }>;
};

async function getProvider(slug: string) {
  return prisma.provider.findUnique({
    where: { slug },
    include: {
      user: { select: { firstName: true, lastName: true, avatarUrl: true } },
      services: {
        where: { isActive: true },
        orderBy: { sortOrder: "asc" },
        include: {
          addOns: { where: { isActive: true } },
        },
      },
      mediaAssets: {
        where: { isHidden: false },
        orderBy: { sortOrder: "asc" },
        take: 20,
      },
    },
  });
}

async function getReviewStats(providerId: string) {
  const reviews = await prisma.feedback.findMany({
    where: { providerId, isPublic: true, rating: { not: null } },
    select: { rating: true },
  });
  const count = await prisma.feedback.count({
    where: { providerId, isPublic: true },
  });
  if (reviews.length === 0) return { avgRating: null, count };
  const avg = reviews.reduce((s, r) => s + r.rating!, 0) / reviews.length;
  return { avgRating: Math.round(avg * 10) / 10, count };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) return { title: "Not Found" };

  return {
    title: `${provider.businessName} — NailBook`,
    description: provider.bio || `Book with ${provider.businessName}`,
    openGraph: {
      title: `${provider.businessName} — NailBook`,
      description: provider.bio || `Book with ${provider.businessName}`,
      images: provider.coverImageUrl ? [provider.coverImageUrl] : [],
    },
  };
}

export default async function ProviderPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();

  const reviewStats = await getReviewStats(provider.id);

  return (
    <main className="min-h-screen bg-background">
      {/* Cover image */}
      {provider.coverImageUrl && (
        <div className="w-full h-48 bg-border overflow-hidden">
          <img
            src={provider.coverImageUrl}
            alt={provider.businessName}
            className="w-full h-full object-cover"
          />
        </div>
      )}

      <div className="max-w-lg mx-auto px-grid-2 py-grid-3 space-y-grid-3">
        {/* Profile header */}
        <section className="space-y-grid-1">
          <div className="flex items-center gap-grid-1">
            <h1 className="font-display text-3xl">{provider.businessName}</h1>
            {provider.isVerified && (
              <span className="text-xs bg-primary-light text-primary px-2 py-0.5 rounded-full">
                Verified
              </span>
            )}
          </div>
          {provider.bio && (
            <p className="text-text-secondary">{provider.bio}</p>
          )}
          {provider.locationAddress && (
            <p className="text-text-muted text-sm">{provider.locationAddress}</p>
          )}
          <div className="flex gap-grid-2">
            {provider.instagramUrl && (
              <a
                href={provider.instagramUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-text-secondary"
              >
                Instagram
              </a>
            )}
            {provider.tiktokUrl && (
              <a
                href={provider.tiktokUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-muted hover:text-text-secondary"
              >
                TikTok
              </a>
            )}
          </div>
        </section>

        {/* Portfolio grid — portfolio-first per design.md */}
        <section>
          <h2 className="font-display text-xl mb-grid-1">Portfolio</h2>
          {provider.mediaAssets.length > 0 ? (
            <div className="grid grid-cols-3 gap-0.5 rounded-card overflow-hidden">
              {provider.mediaAssets.map((asset) => (
                <div key={asset.id} className="aspect-square bg-border">
                  {asset.type === "PHOTO" ? (
                    <img
                      src={asset.thumbnailUrl || asset.url}
                      alt="Portfolio"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <video
                      src={asset.url}
                      className="w-full h-full object-cover"
                      muted
                      playsInline
                    />
                  )}
                </div>
              ))}
            </div>
          ) : (
            <div className="border-2 border-dashed border-border rounded-card p-grid-3 text-center">
              <p className="text-text-muted text-sm">No portfolio photos yet</p>
            </div>
          )}
        </section>

        {/* Reviews summary */}
        {reviewStats.count > 0 && (
          <section>
            <Link
              href={`/${slug}/reviews`}
              className="bg-surface rounded-card p-grid-2 shadow-card flex items-center justify-between hover:shadow-md transition-shadow"
            >
              <div className="flex items-center gap-grid-2">
                {reviewStats.avgRating !== null && (
                  <>
                    <span className="font-display text-2xl">{reviewStats.avgRating}</span>
                    <div className="flex gap-0.5 text-yellow-400 text-sm">
                      {[1, 2, 3, 4, 5].map((s) => (
                        <span key={s} className={s <= Math.round(reviewStats.avgRating!) ? "text-yellow-400" : "text-border"}>
                          ★
                        </span>
                      ))}
                    </div>
                  </>
                )}
                <span className="text-sm text-text-muted">
                  {reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""}
                </span>
              </div>
              <span className="text-sm text-primary font-medium">View all</span>
            </Link>
          </section>
        )}

        {/* Books closed banner */}
        {!provider.booksOpen && (
          <section>
            <div className="bg-amber-50 border border-amber-200 rounded-card p-grid-2 text-center space-y-1">
              <p className="text-sm font-medium text-amber-800">Books are currently closed</p>
              {provider.booksOpenAt && (
                <p className="text-xs text-amber-700">
                  Books open{" "}
                  {new Date(provider.booksOpenAt).toLocaleString("en-US", {
                    weekday: "long",
                    month: "short",
                    day: "numeric",
                    hour: "numeric",
                    minute: "2-digit",
                    timeZone: provider.timezone,
                  })}
                </p>
              )}
            </div>
          </section>
        )}

        {/* Services */}
        <section>
          <h2 className="font-display text-xl mb-grid-1">Services</h2>
          <Suspense fallback={<div className="space-y-grid-1">{provider.services.map((s) => (
            <div key={s.id} className="bg-surface rounded-card p-grid-2 shadow-card animate-pulse h-32" />
          ))}</div>}>
            <ServiceList services={provider.services} slug={slug} booksOpen={provider.booksOpen} />
          </Suspense>
        </section>

        {/* Policies */}
        <section className="text-sm text-text-muted space-y-1">
          <p>
            Cancellation policy: Cancel at least {provider.cancellationHours}h in
            advance.
          </p>
          <p>Arrival grace period: {provider.arrivalGraceMinutes} minutes.</p>
          <div className="flex gap-2 flex-wrap mt-grid-1">
            {provider.acceptsCard && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded-full text-xs">
                Card
              </span>
            )}
            {provider.acceptsApplePay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded-full text-xs">
                Apple Pay
              </span>
            )}
            {provider.acceptsGooglePay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded-full text-xs">
                Google Pay
              </span>
            )}
            {provider.acceptsCashAppPay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded-full text-xs">
                Cash App Pay
              </span>
            )}
            {provider.acceptsCash && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded-full text-xs">
                Cash
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
