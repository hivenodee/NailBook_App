"use client";

import React, { useCallback, useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { MapPin, Star, Navigation, ExternalLink } from "lucide-react";
import type { MapProvider } from "@/components/ExploreMap";

const ExploreMap = dynamic(() => import("@/components/ExploreMap"), {
  ssr: false,
  loading: () => (
    <div className="w-full h-full min-h-[300px] rounded-card skeleton-shimmer" />
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
  { value: "ESTHETICS", label: "Esthetics" },
  { value: "BROWS_LASHES", label: "Brows & Lashes" },
  { value: "MASSAGE", label: "Massage" },
  { value: "OTHER", label: "Other" },
] as const;

const RADIUS_OPTIONS = [5, 10, 25, 50, 100] as const;

const CATEGORY_LABELS: Record<string, string> = {
  NAILS: "Nails",
  HAIR: "Hair",
  ESTHETICS: "Esthetics",
  BROWS_LASHES: "Brows & Lashes",
  MASSAGE: "Massage",
  OTHER: "Other",
};

export default function ExplorePage(): React.JSX.Element {
  const [category, setCategory] = useState("");
  const [radiusMiles, setRadiusMiles] = useState(25);
  const [userLat, setUserLat] = useState<number | null>(null);
  const [userLng, setUserLng] = useState<number | null>(null);
  const [useLocation, setUseLocation] = useState(false);
  const [providers, setProviders] = useState<Provider[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedProviderId, setSelectedProviderId] = useState<string | null>(
    null
  );
  const [geoError, setGeoError] = useState<string | null>(null);

  const fetchProviders = useCallback(async () => {
    setLoading(true);
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
      const json = await res.json();
      if (json.data?.providers) {
        setProviders(json.data.providers);
      }
    } catch (e) {
      console.error("Failed to fetch providers:", e);
    } finally {
      setLoading(false);
    }
  }, [category, radiusMiles, userLat, userLng]);

  useEffect(() => {
    fetchProviders();
  }, [fetchProviders]);

  function handleToggleLocation() {
    if (useLocation) {
      setUseLocation(false);
      setUserLat(null);
      setUserLng(null);
      setGeoError(null);
      return;
    }

    if (!navigator.geolocation) {
      setGeoError("Geolocation is not supported by your browser.");
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
        setGeoError("Unable to get your location. Please enable location access.");
      }
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="bg-surface border-b border-border/50">
        <div className="max-w-7xl mx-auto px-grid-2 py-grid-2">
          <div className="flex items-center justify-between mb-grid-2">
            <div>
              <h1 className="font-display text-2xl">Explore</h1>
              <p className="text-text-muted text-sm">
                Find providers near you
              </p>
            </div>
            <Link
              href="/"
              className="text-sm text-primary hover:text-primary-hover transition-colors font-medium"
            >
              NailBook
            </Link>
          </div>

          {/* Filter bar */}
          <div className="space-y-grid-1">
            {/* Category chips */}
            <div className="flex gap-2 overflow-x-auto scrollbar-hide pb-1">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat.value}
                  onClick={() => setCategory(cat.value)}
                  className={`px-3 py-1.5 rounded-button text-sm font-medium whitespace-nowrap transition-colors border ${
                    category === cat.value
                      ? "border-primary bg-primary-light text-primary"
                      : "border-border bg-background text-text-secondary hover:border-primary/40"
                  }`}
                >
                  {cat.label}
                </button>
              ))}
            </div>

            {/* Location + distance controls */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleToggleLocation}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-button text-sm font-medium transition-colors border ${
                  useLocation
                    ? "border-primary bg-primary-light text-primary"
                    : "border-border bg-background text-text-secondary hover:border-primary/40"
                }`}
              >
                <Navigation size={14} />
                {useLocation ? "Using my location" : "Use my location"}
              </button>

              {useLocation && (
                <select
                  value={radiusMiles}
                  onChange={(e) => setRadiusMiles(Number(e.target.value))}
                  className="border border-border rounded-button px-3 py-1.5 text-sm bg-background text-text-primary focus:outline-none focus:ring-1 focus:ring-primary"
                >
                  {RADIUS_OPTIONS.map((r) => (
                    <option key={r} value={r}>
                      {r} mi
                    </option>
                  ))}
                </select>
              )}

              {geoError && (
                <span className="text-xs text-status-error">{geoError}</span>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Main content */}
      <div className="max-w-7xl mx-auto px-grid-2 py-grid-2">
        <div className="lg:flex lg:gap-grid-2">
          {/* Map */}
          <div className="lg:flex-1 h-[300px] lg:h-[calc(100vh-220px)] lg:sticky lg:top-4 mb-grid-2 lg:mb-0">
            <ExploreMap
              providers={providers}
              selectedId={selectedProviderId}
              onSelectProvider={setSelectedProviderId}
              userLat={userLat}
              userLng={userLng}
            />
          </div>

          {/* Provider list */}
          <div className="lg:w-[400px] space-y-grid-1">
            <p className="text-sm text-text-muted">
              {loading
                ? "Searching..."
                : `${providers.length} provider${providers.length !== 1 ? "s" : ""} found`}
            </p>

            {loading ? (
              <div className="space-y-grid-1">
                {[1, 2, 3, 4].map((i) => (
                  <div
                    key={i}
                    className="bg-surface rounded-card p-grid-2 border border-border/50 skeleton-shimmer"
                  >
                    <div className="flex gap-3">
                      <div className="w-16 h-16 rounded-lg bg-border/60" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-border/60 rounded w-32" />
                        <div className="h-3 bg-border/40 rounded w-20" />
                        <div className="h-3 bg-border/40 rounded w-24" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : providers.length === 0 ? (
              <div className="border-2 border-dashed border-border rounded-card p-grid-3 text-center">
                <MapPin
                  size={32}
                  className="mx-auto text-text-muted mb-grid-1"
                />
                <p className="text-text-secondary font-medium">
                  No providers found
                </p>
                <p className="text-text-muted text-sm mt-1">
                  Try expanding your search radius or changing the category
                  filter.
                </p>
              </div>
            ) : (
              <div className="space-y-grid-1">
                {providers.map((p) => (
                  <ProviderCard
                    key={p.id}
                    provider={p}
                    isSelected={p.id === selectedProviderId}
                    onSelect={() =>
                      setSelectedProviderId(
                        p.id === selectedProviderId ? null : p.id
                      )
                    }
                  />
                ))}
              </div>
            )}
          </div>
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
}) {
  const thumbnail = p.portfolioThumbnail || p.avatarUrl;

  return (
    <div
      onClick={onSelect}
      className={`bg-surface rounded-card p-grid-2 border transition-all cursor-pointer hover:shadow-soft hover:-translate-y-0.5 ${
        isSelected
          ? "border-primary shadow-soft"
          : "border-border/50"
      }`}
    >
      <div className="flex gap-3">
        {/* Thumbnail */}
        <div className="w-16 h-16 rounded-lg overflow-hidden bg-surface-alt flex-shrink-0">
          {thumbnail ? (
            <img
              src={thumbnail}
              alt={p.businessName}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-text-muted text-lg font-display">
              {p.businessName.charAt(0).toUpperCase()}
            </div>
          )}
        </div>

        {/* Info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <h3 className="font-display text-base truncate">
              {p.businessName}
            </h3>
            {p.isVerified && (
              <span className="text-xs text-primary font-medium flex-shrink-0">
                Verified
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 mt-0.5">
            <span className="text-xs text-text-muted px-1.5 py-0.5 rounded bg-surface-alt border border-border/30">
              {CATEGORY_LABELS[p.category] || p.category}
            </span>
            {p.avgRating !== null && (
              <span className="flex items-center gap-0.5 text-xs text-text-secondary">
                <Star size={12} className="text-yellow-500 fill-yellow-500" />
                {p.avgRating.toFixed(1)}
                <span className="text-text-muted">({p.reviewCount})</span>
              </span>
            )}
          </div>

          <div className="flex items-center gap-3 mt-1.5 text-xs text-text-muted">
            {p.distance !== null ? (
              <span className="flex items-center gap-0.5">
                <MapPin size={11} />
                {p.distance.toFixed(1)} mi
              </span>
            ) : (
              p.locationAddress && (
                <span className="flex items-center gap-0.5 truncate">
                  <MapPin size={11} />
                  {p.locationAddress}
                </span>
              )
            )}
            <span>
              {p.serviceCount} service{p.serviceCount !== 1 ? "s" : ""}
            </span>
            {!p.booksOpen && (
              <span className="text-status-warning">Books closed</span>
            )}
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="flex gap-3 mt-grid-1 pt-grid-1 border-t border-border/30">
        <Link
          href={`/${p.slug}`}
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-1 text-xs font-medium text-primary hover:text-primary-hover transition-colors"
        >
          View Profile
          <ExternalLink size={11} />
        </Link>
        {p.locationLat !== null && p.locationLng !== null && (
          <a
            href={`https://www.google.com/maps/dir/?api=1&destination=${p.locationLat},${p.locationLng}`}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            className="flex items-center gap-1 text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
          >
            Directions
            <ExternalLink size={11} />
          </a>
        )}
      </div>
    </div>
  );
}
