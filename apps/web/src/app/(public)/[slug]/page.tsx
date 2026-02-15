import React from "react";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/db";
import type { Metadata } from "next";

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
            <h1 className="text-2xl font-semibold">{provider.businessName}</h1>
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
          <h2 className="text-lg font-medium mb-grid-1">Portfolio</h2>
          {provider.mediaAssets.length > 0 ? (
            <div className="grid grid-cols-3 gap-1 rounded-card overflow-hidden">
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

        {/* Services */}
        <section>
          <h2 className="text-lg font-medium mb-grid-1">Services</h2>
          <div className="space-y-grid-1">
            {provider.services.map((service) => (
              <div
                key={service.id}
                className="bg-surface rounded-card p-grid-2 shadow-card"
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className="font-medium">{service.name}</h3>
                    {service.description && (
                      <p className="text-sm text-text-muted mt-0.5">
                        {service.description}
                      </p>
                    )}
                    <p className="text-sm text-text-muted mt-1">
                      {service.durationMinutes} min
                    </p>
                    {service.addOns.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 mt-1.5">
                        {service.addOns.map((addon) => (
                          <span
                            key={addon.id}
                            className="text-xs bg-primary-light text-text-secondary px-2 py-0.5 rounded-full"
                          >
                            {addon.name} +${(addon.priceInCents / 100).toFixed(2)}
                            {addon.durationMinutes > 0 && ` · +${addon.durationMinutes}min`}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                  <div className="text-right">
                    <p className="font-medium">
                      ${(service.priceInCents / 100).toFixed(2)}
                    </p>
                    {service.depositType !== "NONE" && (
                      <p className="text-xs text-text-muted">
                        Deposit:{" "}
                        {service.depositType === "FLAT"
                          ? `$${(service.depositValue / 100).toFixed(2)}`
                          : `${service.depositValue}%`}
                      </p>
                    )}
                  </div>
                </div>
                <a
                  href={`/${slug}/book?service=${service.id}`}
                  className="mt-grid-2 block w-full text-center bg-primary text-white py-2.5 rounded-button text-sm font-medium hover:bg-primary-hover transition-colors"
                >
                  Book Now
                </a>
              </div>
            ))}
          </div>
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
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded text-xs">
                Card
              </span>
            )}
            {provider.acceptsApplePay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded text-xs">
                Apple Pay
              </span>
            )}
            {provider.acceptsGooglePay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded text-xs">
                Google Pay
              </span>
            )}
            {provider.acceptsCashAppPay && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded text-xs">
                Cash App Pay
              </span>
            )}
            {provider.acceptsCash && (
              <span className="bg-primary-light text-text-secondary px-2 py-0.5 rounded text-xs">
                Cash
              </span>
            )}
          </div>
        </section>
      </div>
    </main>
  );
}
