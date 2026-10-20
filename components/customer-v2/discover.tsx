"use client";
// Discovery screens of the redesigned customer portal: Marketplace sections
// (category grid, promo, vendor rows), the Maps tab, the Food Drops tab and the
// Schedules tab wrapper.
import type * as React from "react";
import { useEffect, useMemo, useState } from "react";
import { BadgeCheck, List, MapPin, Search, Timer, Zap } from "lucide-react";
import { MARKET_GROUPS } from "@/lib/market-groups";
import { claimedPercent, discountPercent, dropDisplayStatus, type FoodDrop } from "@/lib/food-drops";
import type { NearbyVendorsMap as NearbyVendorsMapComponent, MapVendor, MapPerson } from "@/components/nearby-vendors-map";
import type { Vendor, V3State } from "@/components/sheplates-v3";
import type { SocialApi } from "@/lib/social";
import type { FoodShort, ShortsApi } from "@/lib/food-shorts";
import type { PeopleApi } from "@/lib/people";
import { PeopleDistanceChips, PersonRow, usePeopleQuery } from "./people";
import { EmptyState, PhotoTile, SectionHeader, SegTabs, Stars, categoryEmoji, closesIn, haversineKm, money, shortArea, useIsMobile, useTicker, vendorPhoto, vendorRating } from "./kit";

type Coords = { latitude?: number; longitude?: number; address?: string };

export function vendorDistanceKm(profile: Coords, vendor: Vendor) {
  return haversineKm(profile.latitude, profile.longitude, vendor.latitude, vendor.longitude);
}

/* ---------- Marketplace sections ---------- */

export function CategoryGrid({ selected, onSelect }: { selected: string; onSelect: (key: string) => void }) {
  return <section data-tour="categories" aria-label="Browse categories" className="grid grid-cols-5 gap-x-2 gap-y-4 md:grid-cols-10">
    {MARKET_GROUPS.map((group) => {
      const active = selected === group.key;
      return <button key={group.key} type="button" aria-label={group.key} aria-pressed={active} onClick={() => onSelect(active ? "All" : group.key)} className="group flex flex-col items-center gap-1.5 text-center">
        <span className={`grid size-14 place-items-center rounded-full text-2xl shadow-sm transition group-hover:-translate-y-0.5 sm:size-16 ${active ? "ring-[3px] ring-[#e0194f] ring-offset-2" : ""}`} style={{ background: group.tint }} aria-hidden>{group.emoji}</span>
        <span className={`text-[11px] font-bold leading-tight ${active ? "text-[#e0194f]" : "text-stone-700"}`}>{group.key}</span>
      </button>;
    })}
  </section>;
}

export function PromoBanner({ onShop }: { onShop: () => void }) {
  return <section className="relative overflow-hidden rounded-[26px] bg-gradient-to-br from-[#1f2a1a] via-[#26331f] to-[#3a1a22] p-5 text-white sm:p-7">
    <div className="absolute -right-6 -top-6 text-[120px] opacity-20" aria-hidden>🥬</div>
    <div className="relative max-w-md"><h2 className="text-xl font-black tracking-[-.02em] sm:text-2xl">Fresh Local Ingredients</h2><p className="mt-1 text-sm text-white/70">From nearby stores and home kitchens</p>
      <button type="button" onClick={onShop} className="mt-4 rounded-full bg-[#e0194f] px-5 py-2 text-sm font-black shadow-[0_10px_24px_rgba(224,25,79,.35)] transition hover:bg-[#c4123f]">Shop Now</button></div>
  </section>;
}

export function VendorMiniCard({ state, vendor, profile, onOpen }: { state: V3State; vendor: Vendor; profile: Coords; onOpen: (id: string) => void }) {
  const rating = vendorRating(state, vendor.id); const distance = vendorDistanceKm(profile, vendor);
  return <button type="button" onClick={() => onOpen(vendor.id)} aria-label={`Open ${vendor.businessName}`} className="w-[150px] shrink-0 snap-start text-left sm:w-[170px]">
    <PhotoTile imageUrl={vendorPhoto(state, vendor)} category={vendor.category} className="h-[110px] rounded-[22px] shadow-sm transition hover:shadow-md sm:h-[124px]" emojiSize={42} />
    <div className="mt-2 truncate text-sm font-black">{vendor.businessName}</div>
    <div className="mt-0.5 flex items-center gap-1 text-[11px] font-bold text-stone-500">{rating ? <><Stars value={rating.average} size={11} /><span>{rating.average.toFixed(1)}</span></> : <span>New</span>}{distance !== null && <span>· {distance.toFixed(1)} km</span>}</div>
  </button>;
}

export function VendorRow({ title, vendors, state, profile, onOpen, onSeeAll }: { title: string; vendors: Vendor[]; state: V3State; profile: Coords; onOpen: (id: string) => void; onSeeAll?: () => void }) {
  if (!vendors.length) return null;
  return <section><SectionHeader title={title} action={onSeeAll ? "See All" : undefined} onAction={onSeeAll} />
    <div className="-mx-1 mt-3 flex snap-x gap-3 overflow-x-auto px-1 pb-2 hide-scrollbar">{vendors.map((vendor) => <VendorMiniCard key={vendor.id} state={state} vendor={vendor} profile={profile} onOpen={onOpen} />)}</div>
  </section>;
}

/* ---------- Vendor list card (Maps tab) ---------- */

export function VendorCard({ state, vendor, profile, onOpen, compact = false }: { state: V3State; vendor: Vendor; profile: Coords; onOpen: (id: string) => void; compact?: boolean }) {
  const rating = vendorRating(state, vendor.id); const distance = vendorDistanceKm(profile, vendor);
  return <div className={`flex items-center gap-3 rounded-[22px] border border-stone-200/70 bg-white p-3 shadow-sm ${compact ? "" : "sm:p-4"}`}>
    <PhotoTile imageUrl={vendorPhoto(state, vendor)} category={vendor.category} className="size-[72px] shrink-0 rounded-2xl" emojiSize={30} />
    <div className="min-w-0 flex-1">
      <div className="flex items-center gap-1.5"><span className="truncate font-black">{vendor.businessName}</span>{vendor.verification === "Verified" && <BadgeCheck className="size-4 shrink-0 text-emerald-600" aria-label="Verified" />}</div>
      <div className="mt-0.5 flex flex-wrap items-center gap-x-2 text-xs font-bold text-stone-500">{rating ? <span className="flex items-center gap-1 text-amber-600"><Stars value={rating.average} size={12} />{rating.average.toFixed(1)} <span className="text-stone-400">({rating.count})</span></span> : <span>New on ShePlates</span>}{distance !== null && <span>· {distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}</span>}<span>· {shortArea(vendor.address)}</span></div>
      <div className="mt-1.5 flex flex-wrap gap-1.5"><span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">{vendor.category}</span>{vendor.delivery && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">Delivery</span>}{vendor.pickup && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-bold text-stone-600">Pickup</span>}</div>
    </div>
    <div className="flex shrink-0 flex-col items-end gap-2">{vendor.openToday ? <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700">Open Now</span> : <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] font-black text-stone-500">Closed</span>}
      <button type="button" onClick={() => onOpen(vendor.id)} className="rounded-full bg-[#e0194f] px-4 py-1.5 text-xs font-black text-white transition hover:bg-[#c4123f]">View</button></div>
  </div>;
}

/* ---------- Maps tab ---------- */

type MapTab = "Nearby" | "Following" | "Trending" | "Shorts" | "People";
const MAP_TABS = ["Nearby", "Following", "Trending", "Shorts", "People"] as const;
const PEOPLE_FILTERS = ["Everyone", "Following", "With status"] as const;
type PeopleFilter = (typeof PEOPLE_FILTERS)[number];

function LazyMap(props: React.ComponentProps<typeof NearbyVendorsMapComponent>) {
  const [Component, setComponent] = useState<typeof NearbyVendorsMapComponent | null>(null);
  useEffect(() => { let alive = true; import("@/components/nearby-vendors-map").then((mod) => { if (alive) setComponent(() => mod.NearbyVendorsMap); }); return () => { alive = false; }; }, []);
  if (!Component) return <div className="grid h-[330px] place-items-center md:h-[460px] rounded-[26px] border border-stone-200/70 bg-stone-50 text-sm text-stone-400">Loading map…</div>;
  return <Component {...props} />;
}

export function MapsTab({ state, profile, social, shorts, people, peopleRadius, onPeopleRadius, onOpenShorts, locationConfirmed, onOpenVendor, onConfirmLocation }: {
  shorts: ShortsApi; people: PeopleApi; peopleRadius: number; onPeopleRadius: (km: number) => void; onOpenShorts: (list: FoodShort[], index: number) => void;
  state: V3State; profile: Coords; social: SocialApi; locationConfirmed: boolean;
  onOpenVendor: (id: string) => void; onConfirmLocation: () => void;
}) {
  const [tab, setTab] = useState<MapTab>("Nearby");
  const [view, setView] = useState<"map" | "list">("map");
  const [vendorRadius, setVendorRadius] = useState(10);
  const [selectedId, setSelectedId] = useState<string>("");
  const [query, setQuery] = useState("");
  const [peopleFilter, setPeopleFilter] = useState<PeopleFilter>("Everyone");
  const mobile = useIsMobile();
  const onPeople = tab === "People";
  const radius = onPeople ? peopleRadius : vendorRadius;
  const setRadius = onPeople ? onPeopleRadius : setVendorRadius;

  // Shorts the customer may see inside the map radius, grouped by vendor (the data layer already applies each vendor's own reach)
  const shortsByVendor = useMemo(() => {
    const map = new Map<string, FoodShort[]>();
    for (const s of shorts.nearby(vendorRadius)) map.set(s.vendorId, [...(map.get(s.vendorId) || []), s]);
    return map;
  }, [shorts, vendorRadius]);

  const rows = useMemo(() => {
    const activity = (vendorId: string) => (shortsByVendor.get(vendorId)?.length || 0) * 2 + state.foodDrops.filter((d) => d.vendorId === vendorId && dropDisplayStatus(d) === "live").length * 3 + state.orders.filter((o) => o.vendorId === vendorId).length * 0.2;
    let vendors = state.vendors.filter((v) => Number.isFinite(v.latitude) && Number.isFinite(v.longitude));
    const q = query.trim().toLowerCase(); if (q) vendors = vendors.filter((v) => `${v.businessName} ${v.category}`.toLowerCase().includes(q));
    if (tab === "Following") vendors = vendors.filter((v) => social.followed.includes(v.id));
    if (tab === "Shorts") vendors = vendors.filter((v) => shortsByVendor.has(v.id));
    if (onPeople) vendors = [];
    const withDistance = vendors.map((vendor) => ({ vendor, distance: vendorDistanceKm(profile, vendor) ?? 0 }));
    const inRange = withDistance.filter((r) => tab === "Following" || r.distance <= vendorRadius);
    return tab === "Trending" ? inRange.sort((a, b) => activity(b.vendor.id) - activity(a.vendor.id)) : inRange.sort((a, b) => a.distance - b.distance);
  }, [state.vendors, state.foodDrops, state.orders, social.followed, tab, query, vendorRadius, onPeople, profile.latitude, profile.longitude, shortsByVendor]);

  // People who chose to be on the map, inside the radius (the database already limits what it returns)
  const peopleQuery = usePeopleQuery(() => people.nearby(peopleRadius, query), [peopleRadius, query, people.mode, people.hasPin, locationConfirmed], onPeople && locationConfirmed && people.hasPin);
  const nearbyPeople = useMemo(() => peopleQuery.rows
    .map((p) => ({ ...p, following: people.followingIds.has(p.id) }))
    .filter((p) => peopleFilter === "Everyone" || (peopleFilter === "Following" ? p.following : Boolean(p.hasStatus))), [peopleQuery.rows, people.followingIds, peopleFilter]);
  const selectedPerson = nearbyPeople.find((p) => p.id === selectedId) || nearbyPeople[0];

  const selected = rows.find((r) => r.vendor.id === selectedId) || rows[0];
  const mapVendors: MapVendor[] = rows.map(({ vendor, distance }) => ({
    id: vendor.id, name: vendor.businessName, lat: vendor.latitude!, lng: vendor.longitude!, distanceKm: distance, verified: vendor.verification === "Verified",
    emoji: categoryEmoji(vendor.category), photoUrl: vendorPhoto(state, vendor), kind: "vendor", shortCount: shortsByVendor.get(vendor.id)?.length || 0,
  }));
  const mapPeople: MapPerson[] | undefined = onPeople ? nearbyPeople.flatMap((p) => (p.pin ? [{ id: p.id, handle: p.handle, lat: p.pin.lat, lng: p.pin.lng, distanceKm: p.distanceKm ?? 0, following: p.following, hasStatus: p.hasStatus }] : [])) : undefined;

  if (!locationConfirmed) return <EmptyState emoji="📍" title="Confirm your location to see the map" body="We match vendors to your exact delivery pin, so the map only appears once it's set." action={<button type="button" onClick={onConfirmLocation} className="rounded-full bg-[#e0194f] px-5 py-2 text-sm font-black text-white">Set my location</button>} />;

  return <div className="space-y-4">
    <div className="flex items-center gap-2 rounded-2xl border border-stone-200 bg-white px-3.5 py-3 shadow-sm"><Search className="size-4 text-stone-400" /><input value={query} onChange={(e) => setQuery(e.target.value)} placeholder={onPeople ? "Search people on the map by handle" : "Search vendors on the map"} aria-label={onPeople ? "Search people on the map" : "Search vendors on the map"} className="min-w-0 flex-1 bg-transparent text-sm outline-none" /></div>
    <SegTabs tabs={MAP_TABS} value={tab} onChange={(next) => { setTab(next); setSelectedId(""); }} />
    {onPeople && <div className="space-y-2">
      <PeopleDistanceChips value={peopleRadius} onChange={onPeopleRadius} />
      <div role="tablist" aria-label="Who to show" className="flex gap-2 overflow-x-auto pb-1 hide-scrollbar">{PEOPLE_FILTERS.map((f) => <button key={f} role="tab" type="button" aria-selected={f === peopleFilter} onClick={() => setPeopleFilter(f)} className={`shrink-0 rounded-full border px-3.5 py-2 text-[13px] font-bold transition ${f === peopleFilter ? "border-stone-900 bg-stone-900 text-white" : "border-stone-200 bg-white text-stone-600 hover:border-stone-400"}`}>{f}</button>)}</div>
    </div>}
    {view === "map" ? <div className="overflow-hidden rounded-[26px] shadow-[0_18px_50px_rgba(35,10,20,.12)]">
      <LazyMap customerLat={profile.latitude!} customerLng={profile.longitude!} vendors={mapVendors} radiusKm={radius} onRadiusChange={setRadius} height={mobile ? 330 : 460} photoPins selectedId={selected?.vendor.id} onPinClick={setSelectedId}
        people={mapPeople} selectedPersonId={selectedPerson?.id} onPersonClick={setSelectedId} />
    </div> : onPeople ? <div className="space-y-2" data-testid="people-list">{nearbyPeople.map((p) => <PersonRow key={p.id} person={p} selected={p.id === selectedPerson?.id} onSelect={() => setSelectedId(p.id)} onFollow={people.follow} onUnfollow={people.unfollow} />)}</div>
      : <div className="space-y-3">{rows.map((r) => <VendorCard key={r.vendor.id} state={state} vendor={r.vendor} profile={profile} onOpen={onOpenVendor} />)}</div>}
    {onPeople ? (view === "map" && (selectedPerson ? <PersonRow person={selectedPerson} onFollow={people.follow} onUnfollow={people.unfollow} />
        : peopleQuery.error ? <p role="alert" className="text-sm font-bold text-red-600">{peopleQuery.error}</p>
        : !peopleQuery.loading && <EmptyState emoji="🧭" title={peopleFilter === "Following" ? "Nobody you follow is on the map here" : `Nobody on the map within ${peopleRadius} km`} body="People appear here only when they choose to be on the map. Try a wider distance, or search a handle from Stories." />))
      : view === "map" && (selected ? <div className="space-y-2"><VendorCard state={state} vendor={selected.vendor} profile={profile} onOpen={onOpenVendor} />{(() => { const list = shortsByVendor.get(selected.vendor.id) || []; return list.length ? <button type="button" onClick={() => onOpenShorts(list, 0)} data-testid="watch-shorts" className="flex w-full items-center justify-center gap-2 rounded-2xl border border-[#f4a3b9] bg-[#fff1f5] px-4 py-3 text-sm font-black text-[#e0194f] transition hover:bg-[#ffe3ec]">▶ Watch {list.length} Food Short{list.length === 1 ? "" : "s"} from {selected.vendor.businessName}</button> : null; })()}</div> : <EmptyState emoji={tab === "Following" ? "💛" : tab === "Shorts" ? "🎬" : "🗺️"} title={tab === "Following" ? "You're not following any vendors yet" : tab === "Shorts" ? "No Food Shorts in this range" : "No vendors in this range"} body={tab === "Following" ? "Open a vendor and tap Follow — they'll show up here and in your Following feed." : tab === "Shorts" ? "Vendors with a Food Short that reaches you appear here. Try widening the radius with the + button." : "Try widening the radius with the + button on the map."} />)}
    {onPeople && <p className="px-1 text-[11px] font-bold text-stone-400">Shown to the nearest half kilometre. You appear here only if you switch on “Let people nearby find me” in your profile.</p>}
    <div className="flex justify-center"><button type="button" onClick={() => setView((v) => (v === "map" ? "list" : "map"))} className="inline-flex items-center gap-2 rounded-full border border-stone-200 bg-white px-5 py-2 text-sm font-black shadow-sm transition hover:border-[#f4a3b9]">{view === "map" ? <><List className="size-4" />List ({onPeople ? nearbyPeople.length : rows.length})</> : <><MapPin className="size-4" />Map</>}</button></div>
  </div>;
}

/* ---------- Food Drops tab ---------- */

type DropScope = "Nearby" | "Following" | "Trending" | "Across City";
const DROP_SCOPES = ["Nearby", "Following", "Trending", "Across City"] as const;

function dropTag(drop: FoodDrop) {
  const text = `${drop.title} ${drop.description || ""}`;
  if (/blemish/i.test(text)) return "Slightly blemished";
  if (/surplus/i.test(text)) return "Surplus";
  return null;
}

function DropCard({ drop, state, profile, onClaim }: { drop: FoodDrop; state: V3State; profile: Coords; onClaim: (drop: FoodDrop, quantity: number) => Promise<void> }) {
  useTicker();
  const [busy, setBusy] = useState(false);
  const product = state.products.find((p) => p.id === drop.productId); const vendor = state.vendors.find((v) => v.id === drop.vendorId);
  const distance = vendor ? vendorDistanceKm(profile, vendor) : null; const tag = dropTag(drop);
  const left = drop.remainingQuantity; const urgent = new Date(drop.endsAt).getTime() - Date.now() < 3_600_000;
  return <article className="overflow-hidden rounded-[26px] border border-stone-200/70 bg-white shadow-sm">
    <PhotoTile imageUrl={product?.imageUrl} category={product?.category} className="h-48 sm:h-52" emojiSize={64}>
      <span className={`absolute left-3 top-3 inline-flex items-center gap-1 rounded-xl px-3 py-1.5 text-xs font-black text-white shadow-lg ${urgent ? "bg-[#e0194f]" : "bg-[#171914]/85"}`}><Timer className="size-3.5" /><span><span className="block text-[9px] font-bold uppercase leading-none opacity-80">Closes in</span>{closesIn(drop.endsAt)}</span></span>
      {tag && <span className="absolute right-3 top-3 rounded-full bg-white/95 px-2.5 py-1 text-[10px] font-black text-[#c4123f] shadow">{tag}</span>}
      <span className="absolute bottom-3 right-3 rounded-full bg-white/95 px-2.5 py-1 text-[11px] font-black text-[#e0194f] shadow">{discountPercent(drop)}% off</span>
    </PhotoTile>
    <div className="p-4"><h3 className="font-black leading-snug">{drop.title}</h3>
      <p className="mt-0.5 text-xs font-bold text-stone-500">{vendor?.businessName || "Local vendor"}{distance !== null ? ` · ${distance < 1 ? `${Math.round(distance * 1000)} m` : `${distance.toFixed(1)} km`}` : ""}</p>
      <div className="mt-3 flex items-end justify-between gap-3">
        <div><div className="flex items-baseline gap-2"><span className="text-xl font-black">{money(drop.dropPrice)}</span><span className="text-xs font-bold text-stone-400 line-through">{money(drop.originalPrice)}</span></div><div className="mt-0.5 text-xs font-bold text-stone-500">{left} pack{left === 1 ? "" : "s"} left</div></div>
        <button type="button" disabled={busy || left <= 0} onClick={async () => { setBusy(true); try { await onClaim(drop, 1); } finally { setBusy(false); } }} className="rounded-full bg-[#e0194f] px-6 py-2.5 text-sm font-black text-white shadow-[0_10px_24px_rgba(224,25,79,.3)] transition hover:bg-[#c4123f] disabled:opacity-50">{busy ? "Adding…" : "Add +"}</button>
      </div>
      <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full rounded-full bg-[#e0194f]" style={{ width: `${claimedPercent(drop)}%` }} /></div>
    </div>
  </article>;
}

export function FoodDropsTab({ state, profile, social, onClaim, onRefresh }: { state: V3State; profile: Coords; social: SocialApi; onClaim: (drop: FoodDrop, quantity: number) => Promise<void>; onRefresh: () => void }) {
  const [scope, setScope] = useState<DropScope>("Nearby");
  useEffect(() => { onRefresh(); const id = window.setInterval(onRefresh, 30_000); return () => window.clearInterval(id); }, []);
  const drops = useMemo(() => {
    const live = state.foodDrops.filter((d) => dropDisplayStatus(d) === "live");
    const known = (d: FoodDrop) => state.vendors.find((v) => v.id === d.vendorId);
    const km = (d: FoodDrop) => { const v = known(d); return v ? vendorDistanceKm(profile, v) ?? 99 : 99; };
    if (scope === "Nearby") return live.filter((d) => known(d) && km(d) <= 8).sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
    if (scope === "Following") return live.filter((d) => social.followed.includes(d.vendorId));
    if (scope === "Trending") return [...live].sort((a, b) => claimedPercent(b) - claimedPercent(a) || a.remainingQuantity - b.remainingQuantity);
    return [...live].sort((a, b) => new Date(a.endsAt).getTime() - new Date(b.endsAt).getTime());
  }, [state.foodDrops, state.vendors, scope, social.followed, profile.latitude, profile.longitude]);
  return <div className="space-y-4">
    <div className="flex items-center gap-2"><span className="grid size-9 place-items-center rounded-full bg-[#fff0f4] text-[#e0194f]"><Zap className="size-5" /></span><div><h1 className="text-xl font-black tracking-[-.02em]">Food Drops</h1><p className="text-xs font-bold text-stone-500">Surplus and limited batches from local vendors — while they last.</p></div></div>
    <SegTabs tabs={DROP_SCOPES} value={scope} onChange={setScope} />
    {drops.length ? <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{drops.map((drop) => <DropCard key={drop.id} drop={drop} state={state} profile={profile} onClaim={onClaim} />)}</div>
      : <EmptyState emoji={scope === "Following" ? "💛" : "⚡"} title={scope === "Following" ? "No drops from vendors you follow" : "No live drops here right now"} body={scope === "Following" ? "Follow vendors from their profile and their drops land here first." : "Vendors post drops when they have surplus or a limited batch. Check back soon, or try Across City."} />}
  </div>;
}

/* ---------- Schedules tab ---------- */

export function SchedulesTab({ initial, orders, subscriptions }: { initial: "Orders" | "Subscriptions"; orders: React.ReactNode; subscriptions: React.ReactNode }) {
  const [tab, setTab] = useState<"Orders" | "Subscriptions">(initial);
  useEffect(() => setTab(initial), [initial]);
  return <div className="space-y-5"><div><h1 className="text-xl font-black tracking-[-.02em]">My Schedules</h1></div>
    <SegTabs tabs={["Orders", "Subscriptions"] as const} value={tab} onChange={setTab} className="[&_button]:flex-1 [&_button]:rounded-xl" />
    {tab === "Orders" ? orders : subscriptions}
  </div>;
}

