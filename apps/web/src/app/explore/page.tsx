"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import Image from "next/image";
import { ExternalLink, MapPin, Navigation, Search, Star } from "lucide-react";
import { motion, type Variants } from "framer-motion";
import { Logo } from "@/components/ui/Logo";
import { Heading } from "@/components/ui/Heading";
import { EmptyState } from "@/components/ui/EmptyState";
import { ErrorBanner } from "@/components/ui/ErrorBanner";
import { DiscoveryEmptyArt } from "@/components/ui/empty-art/DiscoveryEmptyArt";
import { cn } from "@/lib/cn";
import type { MapProvider } from "@/components/ExploreMap";

const ExploreMap = dynamic(() => import("@/components/ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] rounded-md skeleton-shimmer bg-cream-100" />
  ),
});

type Provider = MapProvider & {
  category: string;
  locationAddress: string | null;
  isVerified: boolean;
  booksOpen: boolean;
  avatarUrl: string | null;
  portfolioThumbnail: string | null;
  reviewCount: number;
  serviceCount: number;
};

const CATEGORIES = [
  { value: "", label: "All" },
  { value: "NAILS", label: "Nails" },
  { value: "HAIR", label: "Hair" },
  { value: "ESTHETICS", label: "Estheticians" },
  { value: "BROWS_LASHES", label: "Brows & lashes" },
  { value: "MASSAGE", label: "Massage" },
  { value: "OTHER", label: "Other" },
] as const;

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

const CATEGORY_LABELS: Record<string, string> = {
  NAILS: "Nails",
  HAIR: "Hair",
  ESTHETICS: "Estheticians",
  BROWS_LASHES: "Brows & lashes",
  MASSAGE: "Massage",
  OTHER: "Other",
};

const containerVariants: Variants = {
  hidden: {},
  // 50ms stagger per SKILL — discovery feed cadence
  visible: { transition: { staggerChildren: 0.05 } },
};

const cardVariants: Variants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: "easeOut" },
  },
};

export default function ExplorePage(): React.JSX.Element {
  const [category, setCategory] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null,
  );
  const [geoError, setGeoError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [mobileTab, setMobileTab] = useState<"feed" | "map">("feed");

  const fetchProviders = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const params = new URLSearchParams();
      if (category) params.set("category", category);
      if (userLat !== null && userLng !== null) {
        params.set("lat", userLat.toString());
        params.set("lng", userLng.toString());
        params.set("radiusMiles", radiusMiles.toString());
      }
      params.set("limit", "50");

      const res = await fetch(`/api/providers/search?${params}`);
      if (!res.ok) throw new Error("Server error");
      const json = await res.json();
      if (json.data?.providers) {
        setProviders(json.data.providers);
      }
    } catch (e) {
      console.error("Failed to fetch providers:", e);
      setLoadError("We couldn't load providers. Check your connection and try again.");
    } finally {
      setLoading(false);
    }
  }, [category, radiusMiles, userLat, userLng]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  // Client-side text filter — the API doesn't support text search yet.
  const filteredProviders = useMemo(() => {
    if (!searchQuery.trim()) return providers;
    const q = searchQuery.toLowerCase();
    return providers.filter(
      (p) =>
        p.businessName.toLowerCase().includes(q) ||
        (p.locationAddress?.toLowerCase().includes(q) ?? false) ||
        (CATEGORY_LABELS[p.category]?.toLowerCase().includes(q) ?? false),
    );
  }, [providers, searchQuery]);

  function handleToggleLocation() {
    if (useLocation) {
      setUseLocation(false);
      setUserLat(null);
      setUserLng(null);
      setGeoError(null);
      return;
    }
    if (!navigator.geolocation) {
      setGeoError("Geolocation isn't supported by your browser.");
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setUserLat(pos.coords.latitude);
        setUserLng(pos.coords.longitude);
        setUseLocation(true);
        setGeoError(null);
      },
      () => {
        setGeoError("We couldn't access your location. Enable location and try again.");
      },
    );
  }

  return (
    <div className="min-h-screen bg-cream-50 text-ink-900">
      {/* ─── Top section ─── */}
      <header className="border-b border-ink-200">
        <div className="mx-auto max-w-7xl px-6 py-8 space-y-6">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-3">
              <Link href="/">
                <Logo />
              </Link>
              <Heading variant="display" className="text-4xl md:text-5xl tracking-tight">
                Discover Beauty Near You
              </Heading>
            </div>
          </div>

          {/* Search bar */}
          <div className="relative max-w-xl">
            <Search
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-ink-500"
              strokeWidth={1.75}
            />
            <input
              type="search"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search by name, neighborhood, or service"
              className="h-11 w-full rounded-md border border-ink-200 bg-cream-50 pl-11 pr-4 font-sans text-base text-ink-900 placeholder:text-ink-300 transition-colors duration-200 hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
            />
          </div>

          {/* Filter chips */}
          <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1 -mx-1 px-1">
            {CATEGORIES.map((cat) => (
              <FilterChip
                key={cat.value}
                active={category === cat.value}
                onClick={() => setCategory(cat.value)}
              >
                {cat.label}
              </FilterChip>
            ))}
          </div>

          {/* Location + radius controls */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleToggleLocation}
              className={cn(
                "inline-flex items-center gap-1.5 px-4 py-1.5 rounded-pill border font-sans text-sm transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
                useLocation
                  ? "bg-rust-500 text-cream-50 border-rust-500"
                  : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
              )}
            >
              <Navigation size={14} strokeWidth={1.75} />
              {useLocation ? "Using my location" : "Use my location"}
            </button>

            {useLocation && (
              <select
                value={radiusMiles}
                onChange={(e) => setRadiusMiles(Number(e.target.value))}
                className="h-9 rounded-md border border-ink-200 bg-cream-50 px-3 font-sans text-sm text-ink-900 transition-colors hover:border-ink-300 focus:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50"
              >
                {RADIUS_OPTIONS.map((r) => (
                  <option key={r} value={r}>
                    Within {r} mi
                  </option>
                ))}
              </select>
            )}

            {geoError && (
              <span className="font-sans text-xs text-error">{geoError}</span>
            )}
          </div>
        </div>
      </header>

      {/* ─── Mobile tabs ─── */}
      <div className="lg:hidden border-b border-ink-200 sticky top-0 z-30 bg-cream-50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex gap-8" role="tablist">
            <TabButton
              active={mobileTab === "feed"}
              onClick={() => setMobileTab("feed")}
            >
              Feed
            </TabButton>
            <TabButton
              active={mobileTab === "map"}
              onClick={() => setMobileTab("map")}
            >
              Map
            </TabButton>
          </div>
        </div>
      </div>

      {/* ─── Body — desktop two-col, mobile one-tab ─── */}
      <div className="mx-auto max-w-7xl px-6 py-8">
        <div className="lg:grid lg:grid-cols-[3fr_2fr] lg:gap-8">
          {/* Feed column */}
          <section
            className={cn("min-w-0", mobileTab === "feed" ? "block" : "hidden lg:block")}
            aria-label="Provider feed"
          >
            <FeedHeader
              loading={loading}
              count={filteredProviders.length}
              hasQuery={searchQuery.trim().length > 0}
            />

            {loadError ? (
              <ErrorBanner message={loadError} onRetry={fetchProviders} />
            ) : loading ? (
              <div className="space-y-3">
                {[1, 2, 3, 4].map((i) => (
                  <SkeletonCard key={i} />
                ))}
              </div>
            ) : filteredProviders.length === 0 ? (
              <div className="rounded-md border border-dashed border-ink-200">
                <EmptyState
                  customArt={<DiscoveryEmptyArt className="text-rust-500" />}
                  title="Nothing here yet"
                  description="No providers in this area yet. Try expanding your search or checking back soon."
                />
              </div>
            ) : (
              <motion.div
                className="space-y-3"
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.05 }}
                variants={containerVariants}
              >
                {filteredProviders.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    isSelected={p.id === selectedProviderId}
                    onSelect={() =>
                      setSelectedProviderId(
                        p.id === selectedProviderId ? null : p.id,
                      )
                    }
                  />
                ))}
              </motion.div>
            )}
          </section>

          {/* Map column */}
          <section
            className={cn(
              "lg:sticky lg:top-6 lg:h-[calc(100vh-7rem)] h-[calc(100vh-13rem)] rounded-md overflow-hidden border border-ink-200",
              mobileTab === "map" ? "block" : "hidden lg:block",
            )}
            aria-label="Map view"
          >
            <ExploreMap
              providers={providers}
              selectedId={selectedProviderId}
              onSelectProvider={setSelectedProviderId}
              userLat={userLat}
              userLng={userLng}
            />
          </section>
        </div>
      </div>
    </div>
  );
}

// ─── Local components ──────────────────────────────────────────

function FilterChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "shrink-0 px-4 py-1.5 rounded-pill border font-sans text-sm whitespace-nowrap transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-rust-500 focus-visible:ring-offset-2 focus-visible:ring-offset-cream-50",
        active
          ? "bg-rust-500 text-cream-50 border-rust-500"
          : "bg-cream-50 text-ink-700 border-ink-200 hover:border-ink-300",
      )}
    >
      {children}
    </button>
  );
}

function TabButton({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}): React.JSX.Element {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={active}
      onClick={onClick}
      className={cn(
        "font-display text-2xl py-3 transition-colors focus-visible:outline-none",
        active
          ? "text-ink-900 border-b-2 border-rust-500 -mb-px"
          : "text-ink-300 border-b-2 border-transparent hover:text-ink-500",
      )}
    >
      {children}
    </button>
  );
}

function FeedHeader({
  loading,
  count,
  hasQuery,
}: {
  loading: boolean;
  count: number;
  hasQuery: boolean;
}): React.JSX.Element {
  let label: string;
  if (loading) label = "Searching…";
  else if (count === 0) label = hasQuery ? "No matches" : "No providers";
  else label = `${count} provider${count !== 1 ? "s" : ""}`;
  return (
    <p className="mb-4 font-sans text-xs uppercase tracking-wide text-ink-500">
      {label}
    </p>
  );
}

function SkeletonCard(): React.JSX.Element {
  return (
    <div className="rounded-md border border-ink-200 bg-cream-50 p-4">
      <div className="flex gap-4">
        <div className="h-32 w-24 rounded-md skeleton-shimmer bg-cream-100" />
        <div className="flex-1 space-y-2">
          <div className="h-5 w-32 rounded skeleton-shimmer bg-cream-100" />
          <div className="h-3.5 w-20 rounded skeleton-shimmer bg-cream-100" />
          <div className="h-3.5 w-28 rounded skeleton-shimmer bg-cream-100" />
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  provider: p,
  isSelected,
  onSelect,
}: {
  provider: Provider;
  isSelected: boolean;
  onSelect: () => void;
}): React.JSX.Element {
  const thumbnail = p.portfolioThumbnail || p.avatarUrl;
  const specialty = CATEGORY_LABELS[p.category] || p.category;

  return (
    <motion.article
      variants={cardVariants}
      onClick={onSelect}
      className={cn(
        "rounded-md border bg-cream-50 p-4 cursor-pointer transition-all duration-200 hover:-translate-y-px",
        isSelected
          ? "border-rust-500"
          : "border-ink-200 hover:border-ink-300",
      )}
    >
      <div className="flex gap-4">
        {/* Photo */}
        <div className="relative h-32 w-24 shrink-0 overflow-hidden rounded-md bg-cream-100">
          {thumbnail ? (
            <Image
              src={thumbnail}
              alt={p.businessName}
              fill
              sizes="96px"
              className="object-cover"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center font-display text-2xl text-ink-300">
              {p.businessName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1 flex flex-col">
          <div className="flex items-start justify-between gap-2">
            <Heading variant="h4" as="h3" className="truncate text-lg">
              {p.businessName}
            </Heading>
            {p.isVerified && (
              <span className="shrink-0 font-display italic text-xs text-rust-500 border-b border-rust-500 pb-px leading-none mt-1">
                Verified
              </span>
            )}
          </div>

          <p className="mt-0.5 font-sans text-sm text-ink-500">{specialty}</p>

          {/* Rating row */}
          <div className="mt-2 flex items-center gap-2 font-sans text-sm text-ink-700">
            {p.avgRating !== null ? (
              <>
                <Star
                  className="h-3.5 w-3.5 text-rust-500"
                  fill="currentColor"
                  strokeWidth={0}
                />
                <span>{p.avgRating.toFixed(1)}</span>
                <span className="text-ink-500">
                  ({p.reviewCount})
                </span>
              </>
            ) : (
              <span className="text-ink-500 text-xs">No reviews yet</span>
            )}
          </div>

          {/* Meta row — distance + booking availability (proxy for "Next available") */}
          <div className="mt-auto pt-3 flex flex-wrap items-center gap-x-3 gap-y-1 font-sans text-xs text-ink-500">
            {p.distance !== null && (
              <span className="inline-flex items-center gap-1">
                <MapPin size={11} strokeWidth={1.75} />
                {p.distance.toFixed(1)} mi
              </span>
            )}
            {p.distance === null && p.locationAddress && (
              <span className="inline-flex items-center gap-1 truncate max-w-[180px]">
                <MapPin size={11} strokeWidth={1.75} />
                {p.locationAddress}
              </span>
            )}
            <span
              className={cn(
                "inline-flex items-center gap-1.5",
                p.booksOpen ? "text-ink-700" : "text-ink-500",
              )}
            >
              <span
                aria-hidden="true"
                className={cn(
                  "h-1.5 w-1.5 rounded-full",
                  p.booksOpen ? "bg-rust-500" : "bg-ink-300",
                )}
              />
              {p.booksOpen ? "Open for booking" : "Books closed"}
            </span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="mt-4 pt-3 border-t border-ink-200 flex items-center gap-4">
        <Link
          href={`/${p.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="inline-flex items-center gap-1 font-sans text-xs font-medium text-rust-500 hover:text-rust-600 transition-colors"
        >
          View profile
          <ExternalLink size={11} strokeWidth={1.75} />
        </Link>
        {p.locationLat !== null && p.locationLng !== null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${p.locationLat},${p.locationLng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="inline-flex items-center gap-1 font-sans text-xs text-ink-500 hover:text-ink-900 transition-colors"
          >
            Directions
            <ExternalLink size={11} strokeWidth={1.75} />
          </a>
        )}
      </div>
    </motion.article>
  );
}
