"use client";

import { useEffect } from "react";
import { MapContainer, TileLayer, Marker, useMap } from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

interface LocationPreviewMapProps {
  latitude: number | null;
  longitude: number | null;
  emptyLabel: string;
}

// Same inline-SVG pin as the dashboard's branches map — see that file for
// why (sidesteps Leaflet's bundler-breaking default marker icon paths).
const pinIcon = L.divIcon({
  className: "",
  html: `<svg width="28" height="36" viewBox="0 0 28 36" fill="none" xmlns="http://www.w3.org/2000/svg">
    <path d="M14 0C6.268 0 0 6.268 0 14c0 10.5 14 22 14 22s14-11.5 14-22C28 6.268 21.732 0 14 0z" fill="var(--primary)"/>
    <circle cx="14" cy="14" r="5.5" fill="white"/>
  </svg>`,
  iconSize: [28, 36],
  iconAnchor: [14, 36],
});

function Recenter({ position }: { position: [number, number] }) {
  const map = useMap();

  useEffect(() => {
    map.setView(position, 15);
  }, [map, position]);

  return null;
}

export function LocationPreviewMap({ latitude, longitude, emptyLabel }: LocationPreviewMapProps) {
  if (latitude === null || longitude === null || Number.isNaN(latitude) || Number.isNaN(longitude)) {
    return (
      <div className="flex h-48 items-center justify-center rounded-lg bg-gray-50 dark:bg-gray-900 text-sm text-gray-500 dark:text-gray-400">
        {emptyLabel}
      </div>
    );
  }

  const position: [number, number] = [latitude, longitude];

  return (
    <div className="h-48 w-full overflow-hidden rounded-lg">
      <MapContainer
        center={position}
        zoom={15}
        scrollWheelZoom={false}
        style={{ height: "100%", width: "100%" }}
      >
        <TileLayer
          attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />
        <Recenter position={position} />
        <Marker position={position} icon={pinIcon} />
      </MapContainer>
    </div>
  );
}
