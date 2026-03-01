"use client";

import { useEffect, useMemo } from "react";
import L from "leaflet";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import "leaflet/dist/leaflet.css";

export type MapProvider = {
  id: string;
  slug: string;
  businessName: string;
  locationLat: number | null;
  locationLng: number | null;
  avgRating: number | null;
  distance: number | null;
};

function createIcon(selected: boolean) {
  const size = selected ? 20 : 14;
  const color = selected ? "#667A55" : "#7B8B6A";
  return L.divIcon({
    className: "",
    iconSize: [size, size],
    iconAnchor: [size / 2, size / 2],
    html: `<div style="width:${size}px;height:${size}px;border-radius:50%;background:${color};border:2px solid white;box-shadow:0 1px 4px rgba(0,0,0,0.2);"></div>`,
  });
}

function MapController({
  providers,
  userLat,
  userLng,
}: {
  providers: MapProvider[];
  userLat: number | null;
  userLng: number | null;
}) {
  const map = useMap();

  useEffect(() => {
    const points: [number, number][] = providers
      .filter((p) => p.locationLat !== null && p.locationLng !== null)
      .map((p) => [p.locationLat!, p.locationLng!]);

    if (userLat !== null && userLng !== null) {
      points.push([userLat, userLng]);
    }

    if (points.length > 0) {
      const bounds = L.latLngBounds(points.map(([lat, lng]) => [lat, lng]));
      map.fitBounds(bounds, { padding: [40, 40], maxZoom: 13 });
    } else if (userLat !== null && userLng !== null) {
      map.setView([userLat, userLng], 12);
    }
  }, [map, providers, userLat, userLng]);

  return null;
}

export default function ExploreMap({
  providers,
  selectedId,
  onSelectProvider,
  userLat,
  userLng,
}: {
  providers: MapProvider[];
  selectedId: string | null;
  onSelectProvider: (id: string | null) => void;
  userLat: number | null;
  userLng: number | null;
}): React.JSX.Element {
  const defaultIcon = useMemo(() => createIcon(false), []);
  const selectedIcon = useMemo(() => createIcon(true), []);

  return (
    <MapContainer
      center={[39.8, -98.5]}
      zoom={4}
      className="w-full h-full rounded-card"
      style={{ minHeight: "300px" }}
    >
      <TileLayer
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
      />
      <MapController
        providers={providers}
        userLat={userLat}
        userLng={userLng}
      />
      {providers.map((p) => {
        if (p.locationLat === null || p.locationLng === null) return null;
        const isSelected = p.id === selectedId;
        return (
          <Marker
            key={p.id}
            position={[p.locationLat, p.locationLng]}
            icon={isSelected ? selectedIcon : defaultIcon}
            eventHandlers={{
              click: () => onSelectProvider(p.id),
            }}
          >
            <Popup>
              <div className="min-w-[180px] space-y-1.5 p-0.5">
                <p className="font-display text-base font-semibold text-text-primary">
                  {p.businessName}
                </p>
                <div className="flex items-center gap-2 text-xs text-text-secondary">
                  {p.avgRating !== null && (
                    <span className="flex items-center gap-0.5">
                      <span className="text-yellow-500">&#9733;</span>
                      {p.avgRating.toFixed(1)}
                    </span>
                  )}
                  {p.distance !== null && (
                    <span>{p.distance.toFixed(1)} mi</span>
                  )}
                </div>
                <div className="flex gap-2 pt-1">
                  <a
                    href={`/${p.slug}`}
                    className="text-xs font-medium text-primary hover:text-primary-hover transition-colors"
                  >
                    View Profile
                  </a>
                  <a
                    href={`https://www.google.com/maps/dir/?api=1&destination=${p.locationLat},${p.locationLng}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-xs font-medium text-text-muted hover:text-text-secondary transition-colors"
                  >
                    Directions
                  </a>
                </div>
              </div>
            </Popup>
          </Marker>
        );
      })}
    </MapContainer>
  );
}
