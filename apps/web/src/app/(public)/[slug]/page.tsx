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
      {/* Cover image with gradient overlay */}
      <div className="relative w-full h-[200px] bg-border overflow-hidden">
        {provider.coverImageUrl ? (
          <img
            src={provider.coverImageUrl}
            alt={provider.businessName}
            className="w-full h-full object-cover"
          />
        ) : (
          <div className="w-full h-full bg-gradient-to-br from-primary-light to-accent-light" />
        )}
        <div className="absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-background to-transparent" />
      </div>

      <div className="max-w-lg mx-auto px-grid-2 pb-grid-6 space-y-grid-3 animate-fade-in-up">
        {/* Profile header — centered, avatar overlapping cover */}
        <section className="relative z-10 text-center -mt-10 space-y-grid-1">
          {/* Avatar */}
          {provider.user.avatarUrl ? (
            <img
              src={provider.user.avatarUrl}
              alt={provider.businessName}
              className="w-20 h-20 rounded-full border-4 border-surface object-cover mx-auto shadow-soft relative"
            />
          ) : (
            <div className="w-20 h-20 rounded-full border-4 border-surface bg-primary-light flex items-center justify-center mx-auto shadow-soft relative">
              <span className="font-display text-2xl text-primary">
                {provider.businessName.charAt(0)}
              </span>
            </div>
          )}

          {/* Name + badge */}
          <div className="space-y-1">
            <h1 className="font-display text-3xl">{provider.businessName}</h1>
            {provider.isVerified && (
              <span className="inline-flex text-xs bg-primary-light text-primary px-2.5 py-0.5 rounded-full font-medium">
                Verified
              </span>
            )}
          </div>

          {/* Location + social links */}
          {provider.locationAddress && (
            <p className="text-text-muted text-sm">{provider.locationAddress}</p>
          )}
          {(provider.instagramUrl || provider.tiktokUrl) && (
            <div className="flex justify-center gap-grid-2">
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
          )}

          {/* Trust row: rating + review count */}
          {reviewStats.count > 0 && reviewStats.avgRating !== null && (
            <div className="flex items-center justify-center gap-2 text-sm text-text-secondary">
              <div className="flex gap-0.5 text-status-warning">
                {[1, 2, 3, 4, 5].map((s) => (
                  <span key={s} className={s <= Math.round(reviewStats.avgRating!) ? "text-status-warning" : "text-border"}>
                    ★
                  </span>
                ))}
              </div>
              <span className="font-display">{reviewStats.avgRating}</span>
              <span className="text-text-muted">·</span>
              <Link href={`/${slug}/reviews`} className="text-primary hover:underline underline-offset-2">
                {reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""}
              </Link>
            </div>
          )}

          {/* Bio */}
          {provider.bio && (
            <p className="text-text-secondary text-sm max-w-sm mx-auto">{provider.bio}</p>
          )}
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

        {/* Books closed banner */}
        {!provider.booksOpen && (
          <section>
            <div className="bg-status-warning/10 border border-status-warning/20 rounded-card p-grid-2 text-center space-y-1">
              <p className="text-sm font-medium text-status-warning">Books are currently closed</p>
              {provider.booksOpenAt && (
                <p className="text-xs text-text-muted">
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
            <div key={s.id} className="bg-surface rounded-card p-grid-2 border border-border/30 skeleton-shimmer h-32" />
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
