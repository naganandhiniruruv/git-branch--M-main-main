"use client";
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Polyline, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, ShoppingBag, Footprints } from "lucide-react";

export type MapVendor = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  verified?: boolean;
  productCount?: number;
};

export type TrailVendor = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  orderCount: number;
};

/** Samples a quadratic bezier arc between two points instead of a straight
 * line — reads as an actual travelled route on a map rather than a ruler
 * line, and keeps two overlapping trails visually distinguishable. */
function arcPoints(aLat: number, aLng: number, bLat: number, bLng: number, segments = 28): [number, number][] {
  const dLat = bLat - aLat, dLng = bLng - aLng;
  const dist = Math.hypot(dLat, dLng) || 1;
  const bow = dist * 0.18;
  const controlLat = (aLat + bLat) / 2 - (dLng / dist) * bow;
  const controlLng = (aLng + bLng) / 2 + (dLat / dist) * bow;
  const points: [number, number][] = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments;
    const lat = (1 - t) ** 2 * aLat + 2 * (1 - t) * t * controlLat + t ** 2 * bLat;
    const lng = (1 - t) ** 2 * aLng + 2 * (1 - t) * t * controlLng + t ** 2 * bLng;
    points.push([lat, lng]);
  }
  return points;
}

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
  customerLat, customerLng, vendors, radiusKm, onRadiusChange, onSelectVendor, trails = [],
}: {
  customerLat: number; customerLng: number; vendors: MapVendor[]; radiusKm: number;
  onRadiusChange: (km: number) => void; onSelectVendor?: (vendorId: string) => void; trails?: TrailVendor[];
}) {
  const [dragRadius, setDragRadius] = useState<number | null>(null);
  const [showTrails, setShowTrails] = useState(false);
  const effectiveRadius = dragRadius ?? radiusKm;
  const trailTotals = useMemo(() => ({
    vendors: trails.length,
    orders: trails.reduce((sum, t) => sum + t.orderCount, 0),
    km: trails.reduce((sum, t) => sum + t.distanceKm * t.orderCount, 0),
  }), [trails]);
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
        {/* Esri World Street Map: a free, no-API-key raster tile set with the
            clean, colour-coded roads/labels look of a mainstream consumer map
            app (the raw-OSM tile style reads as more of a technical basemap,
            and CARTO's free basemap CDN now requires its own API key). */}
        <TileLayer
          url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}"
          attribution="Tiles &copy; Esri &mdash; Esri, HERE, Garmin, USGS, EPA, NPS"
          maxZoom={19}
        />
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
        {showTrails && trails.map((trail) => (
          <Polyline
            key={`trail-${trail.id}`}
            // dashArray (a native Leaflet path option) is what actually
            // reaches the rendered SVG element — pathOptions.className does
            // not propagate through this react-leaflet version, so the
            // trail-flow animation targets the stroke colour directly (see
            // app/globals.css) instead of depending on a custom class.
            positions={arcPoints(customerLat, customerLng, trail.lat, trail.lng)}
            pathOptions={{ color: "#c1651f", weight: Math.min(6, 3 + trail.orderCount * 0.6), opacity: 0.85, dashArray: "10 9", lineCap: "round" }}
          />
        ))}
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
      {/* Icon-only and fixed-size on every viewport — the left chip's text
          ("N km · N vendors in range") grows with vendor count and collided
          with a text-label version of this button on narrow screens. */}
      <button
        type="button"
        aria-label="My food trail"
        title="My food trail"
        onClick={() => setShowTrails((value) => !value)}
        className={`absolute right-3 top-3 z-[1000] grid size-9 shrink-0 place-items-center rounded-full border shadow-sm backdrop-blur transition ${showTrails ? "border-[#c1651f] bg-[#c1651f] text-white" : "border-white/70 bg-white/92 text-[#171917] hover:bg-white"}`}
      >
        <Footprints className="size-4" />
      </button>
      {showTrails && (
        <div className="absolute bottom-3 left-3 z-[1000] max-w-[calc(100%-1.5rem)] rounded-2xl border border-white/70 bg-white/95 px-3.5 py-2.5 text-xs shadow-sm backdrop-blur">
          {trails.length ? (
            <div className="flex items-center gap-2">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-[#fdece0] text-[#c1651f]"><Footprints className="size-4" /></span>
              <div className="min-w-0">
                <div className="font-black text-[#171917]">{trailTotals.km.toFixed(0)} km sourced so far</div>
                <div className="mt-0.5 text-[11px] text-stone-500">{trailTotals.orders} order{trailTotals.orders === 1 ? "" : "s"} · {trailTotals.vendors} vendor{trailTotals.vendors === 1 ? "" : "s"} in your trail</div>
              </div>
            </div>
          ) : (
            <div className="flex items-center gap-2 text-stone-500"><Footprints className="size-4 shrink-0" /> Your first paid order will start a food trail here.</div>
          )}
        </div>
      )}
      <div className="pointer-events-none absolute bottom-3 right-3 z-[1000] flex items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-stone-500 shadow-sm backdrop-blur">
        <ShoppingBag className="size-3 text-[#237a45]" /> Drag the green handle, or use +/−, to change your radius
      </div>
    </div>
  );
}
