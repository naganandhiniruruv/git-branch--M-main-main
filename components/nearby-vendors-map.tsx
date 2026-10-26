"use client";
 
import { useEffect, useMemo, useRef, useState } from "react";
import { MapContainer, TileLayer, Marker, Circle, Popup, useMap } from "react-leaflet";
import L from "leaflet";
import { MapPin, ShoppingBag } from "lucide-react";
import { uniqueValidMapPins } from "@/lib/connect-map";

export type MapVendor = {
  id: string;
  name: string;
  lat: number;
  lng: number;
  distanceKm: number;
  verified?: boolean;
  productCount?: number;
  emoji?: string;
  photoUrl?: string;
  kind?: "vendor" | "trial";
  /** Food Shorts from this vendor that the customer may watch (shown as a play badge on the pin). */
  shortCount?: number;
};

/** A customer who chose to be on the map. The position is already coarse (about 550 m) when it arrives. */
export type MapPerson = { id: string; handle: string; lat: number; lng: number; distanceKm: number; following?: boolean; hasStatus?: boolean };

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

/** Zoom that fits a search circle of the given radius in a typical map viewport. */
function zoomForRadius(radiusKm: number) {
  return radiusKm <= 1 ? 15 : radiusKm <= 2 ? 14 : radiusKm <= 5 ? 13 : radiusKm <= 10 ? 12 : radiusKm <= 20 ? 11 : 10;
}

/** Vendors that share (almost) the same pin would hide each other. Fan them out on a tiny
 * ring (about 30 m) around the shared point so every pin stays visible and tappable. */
function spreadOverlaps<T extends { id: string; lat: number; lng: number }>(vendors: T[]): T[] {
  const groups = new Map<string, T[]>();
  for (const v of vendors) { const key = `${v.lat.toFixed(4)},${v.lng.toFixed(4)}`; groups.set(key, [...(groups.get(key) || []), v]); }
  return vendors.map((v) => {
    const group = groups.get(`${v.lat.toFixed(4)},${v.lng.toFixed(4)}`) || [v];
    if (group.length < 2) return v;
    const index = group.findIndex((g) => g.id === v.id);
    const angle = (2 * Math.PI * index) / group.length;
    const dLat = (0.03 / 111.32) * Math.sin(angle);
    const dLng = (0.03 / (111.32 * Math.max(0.2, Math.cos((v.lat * Math.PI) / 180)))) * Math.cos(angle);
    return { ...v, lat: v.lat + dLat, lng: v.lng + dLng };
  });
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
/** Round "photo" pin used by the Maps tab: the vendor's photo (or a category
 * emoji on a soft tint when they have none), a white ring, and a crimson dot
 * for food-trial pins. Pure inline styles so Leaflet's divIcon needs no CSS file. */
function photoPin(vendor: MapVendor, selected: boolean, zoom = 13) {
  // pins shrink when zoomed out so a dense neighbourhood stays readable, and grow back as you zoom in
  const base = zoom >= 14 ? 52 : zoom >= 12 ? 42 : zoom >= 11 ? 36 : 30;
  const size = selected ? base + 10 : base;
  const fill = vendor.photoUrl ? `background:url('${vendor.photoUrl.replace(/'/g, "%27")}') center/cover` : "background:linear-gradient(135deg,#fff1f5,#ffd9e4)";
  const inner = vendor.photoUrl ? "" : `<span style="font-size:${Math.round(size * 0.46)}px;line-height:1">${vendor.emoji || "🍽️"}</span>`;
  const shortsBadge = vendor.shortCount ? `<span style="position:absolute;right:-6px;bottom:-4px;min-width:22px;height:20px;padding:0 5px;border-radius:9999px;background:#e0194f;color:#fff;font-size:10px;font-weight:900;display:flex;align-items:center;justify-content:center;gap:2px;border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.25)">&#9654;${vendor.shortCount > 1 ? vendor.shortCount : ""}</span>` : "";
  const badge = vendor.kind === "trial" ? `<span style="position:absolute;right:-2px;top:-2px;width:18px;height:18px;border-radius:9999px;background:#e0194f;color:#fff;font-size:10px;display:grid;place-items:center;border:2px solid #fff">🍴</span>` : "";
  return divIcon(
    `<span class="sp-map-photo-pin" style="position:relative;display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;border:3px solid ${selected ? "#e0194f" : "#fff"};box-shadow:0 6px 18px rgba(30,10,18,.28);${fill};transition:all .15s" data-shorts="${vendor.shortCount || 0}">${inner}${badge}${shortsBadge}</span>`,
    size,
  );
}
/** A person's pin: a round avatar with their initial. Crimson ring when you follow them, a dot when they have a status. */
function personPin(person: MapPerson, selected: boolean) {
  const size = selected ? 46 : 38;
  const ring = selected ? "#e0194f" : person.following ? "#e0194f" : "#a8a29e";
  const dot = person.hasStatus ? `<span style="position:absolute;right:-2px;top:-2px;width:14px;height:14px;border-radius:9999px;background:#22c55e;border:2px solid #fff"></span>` : "";
  const initial = (person.handle[0] || "?").toUpperCase().replace(/[<>&"']/g, "");
  return divIcon(
    `<span class="sp-map-person-pin" data-person="${person.id.replace(/[^a-zA-Z0-9_.@-]/g, "")}" style="position:relative;display:grid;place-items:center;width:${size}px;height:${size}px;border-radius:9999px;border:3px solid ${ring};background:linear-gradient(135deg,#fff1f5,#ffd0de);color:#c4123f;font:900 ${Math.round(size * 0.42)}px/1 system-ui;box-shadow:0 6px 18px rgba(30,10,18,.28)">${initial}${dot}</span>`,
    size,
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
    map.flyTo([lat, lng], zoomForRadius(radiusKm), { duration: 0.5 });
  }, [map, lat, lng, radiusKm]);
  return null;
}

/** Zoom in/out and "centre on me", stacked under the trail button. Built as one Leaflet
 * control (the default zoom control sat under the radius chip and could not be moved). */
function MapControls({ lat, lng, radiusKm }: { lat: number; lng: number; radiusKm: number }) {
  const map = useMap();
  useEffect(() => {
    const Control = L.Control.extend({
      onAdd() {
        const box = L.DomUtil.create("div", "sp-map-controls");
        box.style.cssText = "display:flex;flex-direction:column;gap:6px;margin-top:52px;margin-right:12px";
        const make = (label: string, aria: string, onClick: () => void) => {
          const b = L.DomUtil.create("button", "", box) as HTMLButtonElement;
          b.type = "button"; b.textContent = label; b.setAttribute("aria-label", aria); b.title = aria;
          b.style.cssText = "width:36px;height:36px;border-radius:9999px;border:1px solid rgba(255,255,255,.7);background:rgba(255,255,255,.94);color:#171917;font:900 18px/1 system-ui;box-shadow:0 2px 8px rgba(0,0,0,.18);cursor:pointer;backdrop-filter:blur(6px)";
          L.DomEvent.on(b, "click", (e) => { L.DomEvent.stop(e); onClick(); });
        };
        make("+", "Zoom in", () => map.zoomIn());
        make("\u2212", "Zoom out", () => map.zoomOut());
        make("\u25CE", "Centre the map on my location", () => map.flyTo([lat, lng], zoomForRadius(radiusKm), { duration: 0.5 }));
        L.DomEvent.disableClickPropagation(box);
        return box;
      },
    });
    const control = new Control({ position: "topright" });
    control.addTo(map);
    return () => { control.remove(); };
  }, [map, lat, lng, radiusKm]);
  return null;
}

/** Reports the map's zoom level so pin sizes can follow it. */
function ZoomWatcher({ onZoom }: { onZoom: (zoom: number) => void }) {
  const map = useMap();
  useEffect(() => {
    const handler = () => onZoom(map.getZoom());
    handler();
    map.on("zoomend", handler);
    return () => { map.off("zoomend", handler); };
  }, [map, onZoom]);
  return null;
}

/** When a vendor is chosen from the list or card, bring its pin into view without
 * fighting the customer's own panning. */
function FlyToSelected({ selectedId, vendors }: { selectedId?: string; vendors: { id: string; lat: number; lng: number }[] }) {
  const map = useMap();
  const last = useRef<string | undefined>(undefined);
  useEffect(() => {
    if (!selectedId || last.current === selectedId) return;
    last.current = selectedId;
    const target = vendors.find((v) => v.id === selectedId);
    if (!target) return;
    const point = L.latLng(target.lat, target.lng);
    if (!map.getBounds().pad(-0.15).contains(point)) map.flyTo(point, Math.max(map.getZoom(), 13), { duration: 0.45 });
  }, [map, selectedId, vendors]);
  return null;
}

export function NearbyVendorsMap({
  customerLat, customerLng, vendors, radiusKm, onRadiusChange, onSelectVendor,
  height = 420, photoPins = false, onPinClick, selectedId, people, selectedPersonId, onPersonClick,
}: {
  customerLat: number; customerLng: number; vendors: MapVendor[]; radiusKm: number;
  onRadiusChange: (km: number) => void; onSelectVendor?: (vendorId: string) => void;
  height?: number; photoPins?: boolean; onPinClick?: (vendorId: string) => void; selectedId?: string;
  /** When given, the map shows people instead of vendors and the chip counts people. */
  people?: MapPerson[]; selectedPersonId?: string; onPersonClick?: (personId: string) => void;
}) {
  const [dragRadius, setDragRadius] = useState<number | null>(null);
  const [zoom, setZoom] = useState(() => zoomForRadius(radiusKm));
  const effectiveRadius = dragRadius ?? radiusKm;
  // The handle marker's own position must NOT be derived from state that its
  // own drag handler updates (dragRadius) — react-leaflet calls setLatLng()
  // whenever the `position` prop changes, which would fight Leaflet's native
  // drag tracking mid-gesture (observed: the marker moved ~2x the mouse
  // delta). It's driven only by the committed radius, so it stays fully
  // under Leaflet's control during a drag and only snaps once, on release.
  const committedHandlePoint = useMemo(() => pointAtDistanceNorth(customerLat, customerLng, radiusKm), [customerLat, customerLng, radiusKm]);
  const uniqueVendors = useMemo(() => uniqueValidMapPins(vendors), [vendors]);
  const uniquePeople = useMemo(() => uniqueValidMapPins(people || []), [people]);
  const placed = useMemo(() => spreadOverlaps(uniqueVendors), [uniqueVendors]);
  const placedPeople = useMemo(() => spreadOverlaps(uniquePeople), [uniquePeople]);
  const closestId = useMemo(() => {
    if (!uniqueVendors.length) return "";
    return [...uniqueVendors].sort((a, b) => a.distanceKm - b.distanceKm)[0]?.id || "";
  }, [uniqueVendors]);

  return (
    <div className="sp-vendor-map relative overflow-hidden rounded-[26px] border border-stone-200/70">
      <MapContainer center={[customerLat, customerLng]} zoom={zoomForRadius(radiusKm)} scrollWheelZoom zoomControl={false} style={{ height: `${height}px`, width: "100%" }} attributionControl={false}>
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
        <MapControls lat={customerLat} lng={customerLng} radiusKm={radiusKm} />
        <ZoomWatcher onZoom={setZoom} />
        <FlyToSelected selectedId={selectedPersonId || selectedId} vendors={people ? placedPeople : placed} />
        <Circle
          center={[customerLat, customerLng]}
          radius={effectiveRadius * 1000}
          pathOptions={{ color: "#c62653", weight: 2, fillColor: "#c62653", fillOpacity: 0.08 }}
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
        {placedPeople.map((person) => (
          <Marker key={`person-${person.id}`} title={`@${person.handle}`} alt={`@${person.handle}`} position={[person.lat, person.lng]} icon={personPin(person, person.id === selectedPersonId)}
            eventHandlers={onPersonClick ? { click: () => onPersonClick(person.id) } : undefined} zIndexOffset={person.id === selectedPersonId ? 1000 : 0} />
        ))}
        {placed.map((vendor, index) => (
          <Marker
            key={vendor.id}
            title={vendor.name}
            alt={vendor.name}
            position={[vendor.lat, vendor.lng]}
            icon={photoPins ? photoPin(vendor, vendor.id === selectedId, zoom) : vendorIcon(vendor.id === closestId, vendor.distanceKm <= effectiveRadius, index)}
            eventHandlers={onPinClick ? { click: () => onPinClick(vendor.id) } : undefined}
            zIndexOffset={vendor.id === selectedId ? 1000 : 0}
          >
            {!onPinClick && <Popup>
              <div className="min-w-40 text-sm">
                <div className="font-black text-[#171917]">{vendor.name}{vendor.id === closestId && <span className="ml-1.5 rounded-full bg-[#f8e2e8] px-1.5 py-0.5 text-[10px] font-black text-[#c62653]">Closest</span>}</div>
                <div className="mt-1 text-xs text-stone-500">{vendor.distanceKm.toFixed(1)} km away{vendor.verified ? " · Verified" : ""}</div>
                {vendor.productCount ? <div className="mt-0.5 text-xs text-stone-500">{vendor.productCount} product{vendor.productCount === 1 ? "" : "s"} in range</div> : null}
                {onSelectVendor && <button onClick={() => onSelectVendor(vendor.id)} className="mt-2 flex w-full items-center justify-center gap-1.5 rounded-lg bg-[#c62653] px-2 py-1.5 text-xs font-black text-white">View products</button>}
              </div>
            </Popup>}
          </Marker>
        ))}
      </MapContainer>
      <div className="absolute left-3 top-3 z-1000 flex items-center gap-1 rounded-full border border-white/70 bg-white/92 py-1 pl-3 pr-1 text-xs font-black text-[#171917] shadow-sm backdrop-blur">
        <MapPin className="size-3.5 shrink-0 text-[#c62653]" />
        <span className="whitespace-nowrap" data-testid="map-count">{people ? `${radiusKm} km · ${uniquePeople.length} ${uniquePeople.length === 1 ? "person" : "people"} nearby` : `${radiusKm} km · ${uniqueVendors.filter((v) => v.distanceKm <= radiusKm).length} vendor${uniqueVendors.filter((v) => v.distanceKm <= radiusKm).length === 1 ? "" : "s"} in range`}</span>
        <span className="ml-1 flex shrink-0 items-center gap-0.5">
          <button type="button" aria-label="Decrease radius" onClick={() => onRadiusChange(Math.max(1, radiusKm - 1))} className="grid size-6 place-items-center rounded-full bg-stone-100 text-sm font-black leading-none hover:bg-stone-200">−</button>
          <button type="button" aria-label="Increase radius" onClick={() => onRadiusChange(Math.min(30, radiusKm + 1))} className="grid size-6 place-items-center rounded-full bg-stone-100 text-sm font-black leading-none hover:bg-stone-200">+</button>
        </span>
      </div>
      <div className="pointer-events-none absolute bottom-3 right-3 z-1000 flex max-w-[calc(100%-1.5rem)] items-center gap-1.5 rounded-full border border-white/70 bg-white/90 px-3 py-1.5 text-[10px] font-bold text-stone-500 shadow-sm backdrop-blur">
        <ShoppingBag className="hidden size-3 shrink-0 text-[#c62653] sm:block" /><span className="hidden sm:inline">Drag the pink handle, or use +/&minus; on the chip, to change your radius</span><span className="sm:hidden">Tiles &copy; Esri</span><span className="hidden sm:inline">&middot; Tiles &copy; Esri</span>
      </div>
    </div>
  );
}
