"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import type { I18nText, Locale } from "@/types/i18n";

interface BranchLocation {
  id: string;
  code: string;
  name_i18n: I18nText;
  address?: string | null;
  latitude: number | null;
  longitude: number | null;
}

interface BranchesMapProps {
  warehouses: BranchLocation[];
  locale: Locale;
  emptyLabel: string;
}

// A small inline-SVG pin instead of Leaflet's default PNG marker icons —
// those break under bundlers unless their asset paths are patched; this
// sidesteps that entirely and matches the app's own primary color.
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="var(--primary)"/>
    <circle cx="14" cy="14" r="5.5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
  popupAnchor: [0, -32],
});

function FitBounds({ points }: { points: [number, number][] }) {
  const map = useMap();

  useEffect(() => {
    if (points.length === 0) return;
    if (points.length === 1) {
      map.setView(points[0], 14);
      return;
    }
    map.fitBounds(points, { padding: [40, 40] });
  }, [map, points]);

  return null;
}

export function BranchesMap({ warehouses, locale, emptyLabel }: BranchesMapProps) {
  const located = warehouses.filter(
    (w): w is BranchLocation & { latitude: number; longitude: number } =>
      w.latitude !== null && w.longitude !== null,
  );

  if (located.length === 0) {
    return (
      <div className="flex h-64 items-center justify-center rounded-xl bg-gray-50 text-sm text-gray-500">
        {emptyLabel}
      </div>
    );
  }

  const points: [number, number][] = located.map((w) => [w.latitude, w.longitude]);

  return (
    <div className="h-64 w-full overflow-hidden rounded-xl">
      <MapContainer
        center={points[0]}
        zoom={13}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <FitBounds points={points} />
        {located.map((w) => (
          <Marker key={w.id} position={[w.latitude, w.longitude]} icon={pinIcon}>
            <Popup>
              <div className="text-sm">
                <p className="font-semibold">
                  {w.name_i18n[locale]} <span className="text-gray-500">({w.code})</span>
                </p>
                {w.address && <p className="text-gray-600 mt-1">{w.address}</p>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
    </div>
  );
}
