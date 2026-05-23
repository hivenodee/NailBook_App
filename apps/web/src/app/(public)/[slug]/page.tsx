import React, { Suspense } from "react";
import { notFound } from "next/navigation";
import Link from "next/link";
import Image from "next/image";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";
import ServiceList from "@/components/ServiceList";
import { PortfolioGrid } from "@/components/PortfolioGrid";
import { Avatar } from "@/components/ui/Avatar";
import { Button } from "@/components/ui/Button";
import { Heading } from "@/components/ui/Heading";

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
  if (!provider) return { title: "Not found" };

  const description = provider.bio || `Book with ${provider.businessName} on PoroBook.`;
  // Fall back to brand hero image when the provider hasn't uploaded a cover.
  const ogImages = provider.coverImageUrl
    ? [{ url: provider.coverImageUrl, alt: provider.businessName }]
    : [{ url: "/brand/editorial-hands-marble.jpeg", alt: "PoroBook" }];

  return {
    title: provider.businessName,
    description,
    openGraph: {
      title: provider.businessName,
      description,
      images: ogImages,
    },
    twitter: {
      card: "summary_large_image",
      title: provider.businessName,
      description,
      images: ogImages.map((i) => i.url),
    },
  };
}

export default async function ProviderPage({ params }: Props): Promise<React.JSX.Element> {
  const { slug } = await params;
  const provider = await getProvider(slug);
  if (!provider) notFound();

  const reviewStats = await getReviewStats(provider.id);

  // Cheapest service price for the sticky-bar preview.
  const minPriceCents =
    provider.services.length > 0
      ? Math.min(...provider.services.map((s) => s.priceInCents))
      : null;

  return (
    <main className="min-h-screen bg-cream-50 text-ink-900 pb-28 lg:pb-0">
      {/* ─── Hero ─── */}
      <header className="relative w-full overflow-hidden border-b border-ink-200 pt-12 pb-8">
        {provider.coverImageUrl && (
          <>
            <div className="absolute inset-0">
              <Image
                src={provider.coverImageUrl}
                alt={provider.businessName}
                fill
                priority
                sizes="100vw"
                className="object-cover"
              />
            </div>
            <div className="absolute inset-0 bg-gradient-to-b from-transparent via-cream-50/40 to-cream-50" />
          </>
        )}

        <div className="relative z-10 mx-auto max-w-2xl px-6 text-center animate-fade-in-up">
          <Avatar
            name={provider.businessName}
            src={provider.user.avatarUrl}
            size="xl"
            ring={provider.isVerified}
            className="mx-auto h-24 w-24 text-3xl"
          />

          <Heading
            variant="h1"
            className="mt-5 text-4xl md:text-5xl tracking-tight"
          >
            {provider.businessName}
          </Heading>

          {provider.isVerified && (
            <p className="mt-3 inline-block">
              <span className="font-display italic text-sm text-rust-500 border-b border-rust-500 pb-0.5">
                Verified
              </span>
            </p>
          )}

          {provider.locationAddress && (
            <p className="mt-3 font-sans text-sm text-ink-500">
              {provider.locationAddress}
            </p>
          )}

          {(provider.instagramUrl || provider.tiktokUrl) && (
            <div className="mt-5 flex items-center justify-center gap-2">
              {provider.instagramUrl && (
                <SocialGhost href={provider.instagramUrl} label="Instagram" />
              )}
              {provider.tiktokUrl && (
                <SocialGhost href={provider.tiktokUrl} label="TikTok" />
              )}
            </div>
          )}

          {reviewStats.count > 0 && reviewStats.avgRating !== null && (
            <div className="mt-5 flex items-center justify-center gap-2 font-sans text-sm">
              <Stars rating={reviewStats.avgRating} />
              <span className="font-display text-ink-900">
                {reviewStats.avgRating}
              </span>
              <span className="text-ink-300">·</span>
              <Link
                href={`/${slug}/reviews`}
                className="text-rust-500 hover:underline underline-offset-4"
              >
                {reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""}
              </Link>
            </div>
          )}

          {provider.bio && (
            <p className="mt-5 mx-auto max-w-md font-sans text-base text-ink-500 leading-relaxed">
              {provider.bio}
            </p>
          )}

          <p className="mt-5 font-sans text-xs text-ink-500 uppercase tracking-wide">
            {provider.services.length} service
            {provider.services.length !== 1 ? "s" : ""}
            <span className="mx-2 text-ink-300">·</span>
            {reviewStats.count} review{reviewStats.count !== 1 ? "s" : ""}
          </p>
        </div>
      </header>

      {/* ─── Body ─── */}
      <div className="mx-auto max-w-2xl px-6 pt-8 space-y-12">
        {/* Portfolio */}
        <section>
          <SectionHeading>Portfolio</SectionHeading>
          {provider.mediaAssets.length > 0 ? (
            <PortfolioGrid assets={provider.mediaAssets} />
          ) : (
            <div className="rounded-md border border-dashed border-ink-200 p-10 text-center">
              <p className="font-sans text-sm text-ink-500">
                No portfolio photos yet
              </p>
            </div>
          )}
        </section>

        {/* Books closed banner */}
        {!provider.booksOpen && (
          <section
            className="rounded-md border border-rust-500/30 bg-rust-500/5 px-5 py-4 text-center space-y-1"
          >
            <p className="font-sans text-sm font-medium text-rust-600">
              Books are currently closed
            </p>
            {provider.booksOpenAt && (
              <p className="font-sans text-xs text-ink-500">
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
          </section>
        )}

        {/* Services */}
        <section>
          <SectionHeading>Services</SectionHeading>
          <Suspense
            fallback={
              <div className="space-y-3">
                {provider.services.map((s) => (
                  <div
                    key={s.id}
                    className="rounded-md skeleton-shimmer h-32 bg-cream-50 border border-ink-200"
                  />
                ))}
              </div>
            }
          >
            <ServiceList
              services={provider.services}
              slug={slug}
              booksOpen={provider.booksOpen}
            />
          </Suspense>
        </section>

        {/* Policies */}
        <section className="rounded-md border border-ink-200 bg-cream-50 p-6 space-y-5">
          <p className="font-sans text-xs uppercase tracking-wide text-ink-500">
            Policies
          </p>
          <div className="grid grid-cols-2 gap-3">
            <PolicyTile
              value={`${provider.cancellationHours}h`}
              label="Cancellation window"
            />
            <PolicyTile
              value={`${provider.arrivalGraceMinutes}m`}
              label="Grace period"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            {provider.acceptsCard && <PaymentChip>Card</PaymentChip>}
            {provider.acceptsApplePay && <PaymentChip>Apple Pay</PaymentChip>}
            {provider.acceptsGooglePay && <PaymentChip>Google Pay</PaymentChip>}
            {provider.acceptsCashAppPay && (
              <PaymentChip>Cash App Pay</PaymentChip>
            )}
            {provider.acceptsCash && <PaymentChip>Cash</PaymentChip>}
          </div>
        </section>
      </div>

      {/* ─── Sticky Book Now bar ─── */}
      {provider.booksOpen && (
        <StickyBookBar slug={slug} minPriceCents={minPriceCents} />
      )}
    </main>
  );
}

// ─── Local components ──────────────────────────────────────────

function SectionHeading({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <div className="mb-5 flex items-center gap-3">
      <Heading variant="h3">{children}</Heading>
      <span className="block h-px w-7 bg-rust-500" />
    </div>
  );
}

function SocialGhost({
  href,
  label,
}: {
  href: string;
  label: string;
}): React.JSX.Element {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex h-9 items-center justify-center rounded-md border border-transparent bg-transparent px-4 font-sans text-sm font-medium text-ink-900 transition-all duration-200 hover:bg-cream-100 hover:-translate-y-px focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
    >
      {label}
    </a>
  );
}

function Stars({ rating }: { rating: number }): React.JSX.Element {
  const filled = Math.round(rating);
  return (
    <span className="flex items-center gap-0.5" aria-hidden="true">
      {[1, 2, 3, 4, 5].map((s) => (
        <span
          key={s}
          className={s <= filled ? "text-rust-500" : "text-ink-200"}
        >
          ★
        </span>
      ))}
    </span>
  );
}

function PolicyTile({
  value,
  label,
}: {
  value: string;
  label: string;
}): React.JSX.Element {
  return (
    <div className="rounded-md border border-ink-200 bg-cream-100 p-3 text-center">
      <p className="font-display text-2xl text-ink-900">{value}</p>
      <p className="mt-0.5 font-sans text-xs text-ink-500">{label}</p>
    </div>
  );
}

function PaymentChip({
  children,
}: {
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <span className="inline-flex items-center rounded-pill border border-ink-200 bg-cream-50 px-3 py-1 font-sans text-xs text-ink-700">
      {children}
    </span>
  );
}

function StickyBookBar({
  slug,
  minPriceCents,
}: {
  slug: string;
  minPriceCents: number | null;
}): React.JSX.Element {
  return (
    <div
      className="fixed bottom-0 left-0 right-0 z-50 border-t border-ink-200 bg-cream-50 px-6 py-4 lg:hidden safe-bottom"
    >
      <div className="mx-auto max-w-2xl flex items-center justify-between gap-4">
        {minPriceCents !== null ? (
          <div className="flex flex-col leading-tight">
            <span className="font-sans text-[10px] uppercase tracking-wide text-ink-500">
              Starts at
            </span>
            <span className="font-display text-2xl text-ink-900">
              ${(minPriceCents / 100).toFixed(0)}
            </span>
          </div>
        ) : (
          <span className="font-sans text-sm text-ink-500">
            Choose a service to begin
          </span>
        )}

        <Link href={`/${slug}/book`} className="shrink-0">
          <Button variant="primary" size="md">
            Book now
          </Button>
        </Link>
      </div>
    </div>
  );
}
