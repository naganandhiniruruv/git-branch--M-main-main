"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, ShoppingBag } from "lucide-react";

export type MapVendor = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  verified?: boolean;
  productCount?: number;
};

/** Due-north offset approximation — good enough at city scale (matches the
 * precision the app already uses elsewhere for its own haversine helper). */
function pointAtDistanceNorth(lat: number, lng: number, km: number) {
  return { lat: lat + km / 111.32, lng };
}
function haversineKm(aLat: number, aLng: number, bLat: number, bLng: number) {
  const rad = (v: number) => (v * Math.PI) / 180;
  const dLat = rad(bLat - aLat);
  const dLng = rad(bLng - aLng);
  const s = Math.sin(dLat / 2) ** 2 + Math.cos(rad(aLat)) * Math.cos(rad(bLat)) * Math.sin(dLng / 2) ** 2;
  return 6371 * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s));
}

function divIcon(html: string, size: number) {
  return L.divIcon({ html, className: "sp-map-icon", iconSize: [size, size], iconAnchor: [size / 2, size / 2] });
}

const customerIcon = divIcon(
  `<span class="sp-map-you"><span class="sp-map-you-pulse"></span><span class="sp-map-you-dot"></span></span>`,
  28,
);
function vendorIcon(closest: boolean, inRange: boolean, index: number) {
  return divIcon(
    `<span class="sp-map-vendor ${closest ? "sp-map-vendor-closest" : ""} ${inRange ? "" : "sp-map-vendor-dim"}" style="--sp-marker-delay:${Math.min(index, 8) * 45}ms">${closest ? '<span class="sp-map-vendor-ring"></span>' : ""}<span class="sp-map-vendor-pin">🏪</span></span>`,
    closest ? 36 : 30,
  );
}
const handleIcon = divIcon(`<span class="sp-map-handle" title="Drag to change your search radius"></span>`, 20);

/** Keeps the map view centred/zoomed on the customer + radius whenever either
 * changes, without fighting the user's own pan/zoom on every render. */
function RecenterOnRadiusChange({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap();
  const lastRadius = useRef(radiusKm);
  useEffect(() => {
    if (lastRadius.current === radiusKm) return;
    lastRadius.current = radiusKm;
    const zoom = radiusKm <= 2 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : 10;
    map.flyTo([lat, lng], zoom, { duration: 0.5 });
  }, [map, lat, lng, radiusKm]);
  return null;
}

export function NearbyVendorsMap({
  customerLat, customerLng, vendors, radiusKm, onRadiusChange, onSelectVendor,
}: {
  customerLat: number; customerLng: number; vendors: MapVendor[]; radiusKm: number;
  onRadiusChange: (km: number) => void; onSelectVendor?: (vendorId: string) => void;
}) {
  const [dragRadius, setDragRadius] = useState<number | null>(null);
  const effectiveRadius = dragRadius ?? radiusKm;
  // The handle marker's own position must NOT be derived from state that its
  // own drag handler updates (dragRadius) — react-leaflet calls setLatLng()
  // whenever the `position` prop changes, which would fight Leaflet's native
  // drag tracking mid-gesture (observed: the marker moved ~2x the mouse
  // delta). It's driven only by the committed radius, so it stays fully
  // under Leaflet's control during a drag and only snaps once, on release.
  const committedHandlePoint = useMemo(() => pointAtDistanceNorth(customerLat, customerLng, radiusKm), [customerLat, customerLng, radiusKm]);
  const closestId = useMemo(() => {
    if (!vendors.length) return "";
    return [...vendors].sort((a, b) => a.distanceKm - b.distanceKm)[0]?.id || "";
  }, [vendors]);

  return (
    <div className="sp-vendor-map relative overflow-hidden rounded-[26px] border border-stone-200/70">
      <MapContainer center={[customerLat, customerLng]} zoom={12} scrollWheelZoom style={{ height: "420px", width: "100%" }} attributionControl={false}>
        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution="&copy; OpenStreetMap contributors" />
        <RecenterOnRadiusChange lat={customerLat} lng={customerLng} radiusKm={radiusKm} />
        <Circle
          center={[customerLat, customerLng]}
          radius={effectiveRadius * 1000}
          pathOptions={{ color: "#237a45", weight: 2, fillColor: "#237a45", fillOpacity: 0.08 }}
        />
        <Marker position={[customerLat, customerLng]} icon={customerIcon}>
          <Popup>You are here</Popup>
        </Marker>
        <Marker
          position={[committedHandlePoint.lat, committedHandlePoint.lng]}
          icon={handleIcon}
          draggable
          eventHandlers={{
            drag: (event) => {
              const marker = event.target as L.Marker;
              const position = marker.getLatLng();
              const next = Math.min(30, Math.max(1, Math.round(haversineKm(customerLat, customerLng, position.lat, position.lng))));
              setDragRadius(next);
            },
            dragend: (event) => {
              const marker = event.target as L.Marker;
              const position = marker.getLatLng();
              const next = Math.min(30, Math.max(1, Math.round(haversineKm(customerLat, customerLng, position.lat, position.lng))));
              onRadiusChange(next);
              setDragRadius(null);
            },
          }}
        />
        {vendors.map((vendor, index) => (
          <Marker
            key={vendor.id}
            position={[vendor.lat, vendor.lng]}
            icon={vendorIcon(vendor.id === closestId, vendor.distanceKm <= effectiveRadius, index)}
          >
            <Popup>
              <div className="min-w-[160px] text-sm">
                <div className="font-black text-[#171917]">{vendor.name}{vendor.id === closestId && <span className="ml-1.5 rounded-full bg-[#e8f2ea] px-1.5 py-0.5 text-[10px] font-black text-[#237a45]">Closest</span>}</div>
                <div className="mt-1 text-xs text-stone-500">{vendor.distanceKm.toFixed(1)} km away{vendor.verified ? " · Verified" : ""}</div>
                {vendor.productCount ? <div className="mt-0.5 text-xs text-stone-500">{vendor.productCount} product{vendor.productCount === 1 ? "" : "s"} in range</div> : null}
                {onSelectVendor && <button onClick={() => onSelectVendor(vendor.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#237a45] px-2 py-1.5 text-xs font-black text-white">View products</button>}
              </div>
            </Popup>
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute left-3 top-3 z-[1000] flex items-center gap-1 rounded-full border border-white/70 bg-white/92 py-1 pl-3 pr-1 text-xs font-black text-[#171917] shadow-sm backdrop-blur">
        <MapPin className="size-3.5 shrink-0 text-[#237a45]" />
        <span className="whitespace-nowrap">{radiusKm} km · {vendors.filter((v) => v.distanceKm <= radiusKm).length} vendor{vendors.filter((v) => v.distanceKm <= radiusKm).length === 1 ? "" : "s"} in range</span>
        <span className="ml-1 flex shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Decrease radius" onClick={() => onRadiusChange(Math.max(1, radiusKm - 1))} className="grid size-6 place-items-center rounded-full bg-stone-100 text-sm font-black leading-none hover:bg-stone-200">−</button>
          <button type="button" aria-label="Increase radius" onClick={() => onRadiusChange(Math.min(30, radiusKm + 1))} className="grid size-6 place-items-center rounded-full bg-stone-100 text-sm font-black leading-none hover:bg-stone-200">+</button>
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-stone-500 shadow-sm backdrop-blur">
        <ShoppingBag className="size-3 text-[#237a45]" /> Drag the green handle, or use +/−, to change your radius
      </div>
    </div>
  );
}
