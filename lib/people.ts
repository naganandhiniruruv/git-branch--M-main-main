// People: follow other customers, find them by handle, and see who is nearby on the map.
// One hook, two back-ends (the same pattern as lib/social.ts and lib/food-shorts.ts):
//   remote — the functions in supabase/V9_3_PEOPLE_STATUS.sql. The database decides who is on the map and
//            returns only coarse positions and half-kilometre distances.
//   local  — browser storage with clearly marked sample people around the customer, used while the
//            migration is not applied or in demo mode.
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { getSupabaseBrowserClient, isLiveSupabaseMode } from "@/lib/supabase";
import { coarsePin, distanceKm, halfKm, handleMatches, searchReady, MAX_FOLLOWING, type Pin } from "@/lib/people-rules";

export type Person = {
  id: string; handle: string; bio: string; following: boolean; followerCount: number; discoverable?: boolean;
  distanceKm?: number; pin?: Pin; hasStatus?: boolean; sample?: boolean;
};
export type PeopleUser = { email: string; name: string; userId?: string; role?: string; handle?: string; bio?: string };
export type FollowCounts = { followers: number; following: number };

const KEY = (email: string) => `sheplates-people-v1:${email.toLowerCase()}`;
type LocalPeople = { following: string[]; discoverable: boolean; pin?: Pin; followers: string[] };
const EMPTY: LocalPeople = { following: [], discoverable: false, followers: [] };

// Demo mode keeps every customer who has opened the app in one shared list, so two accounts in the same
// browser can find, follow and watch each other. Live mode never uses this.
const REGISTRY = "sheplates-people-registry-v1";
type RegistryEntry = { handle: string; bio: string; discoverable: boolean; pin?: Pin; following: string[] };
function readRegistry(): Record<string, RegistryEntry> { try { return JSON.parse(localStorage.getItem(REGISTRY) || "{}"); } catch { return {}; } }
function writeRegistry(r: Record<string, RegistryEntry>) { try { localStorage.setItem(REGISTRY, JSON.stringify(r)); } catch { /* ignore */ } }
export const localPersonId = (email: string) => `local-${email.toLowerCase()}`;
function readLocal(email: string): LocalPeople { try { const raw = localStorage.getItem(KEY(email)); return raw ? { ...EMPTY, ...JSON.parse(raw) } : { ...EMPTY }; } catch { return { ...EMPTY }; } }
function writeLocal(email: string, value: LocalPeople) { try { localStorage.setItem(KEY(email), JSON.stringify(value)); } catch { /* storage full: keep working in memory */ } }

// Sample people for demo mode: fixed handles, placed on fixed bearings at fixed distances from the customer.
const SAMPLE = [
  { id: "sample-priya", handle: "priya_eats", bio: "Idli over everything. Coimbatore", km: 0.5, bearing: 40, followers: 128, discoverable: true },
  { id: "sample-arjun", handle: "arjun.k", bio: "Weekend biryani hunter", km: 1.5, bearing: 130, followers: 54, discoverable: true },
  { id: "sample-divya", handle: "divya_r", bio: "Home kitchens only", km: 2.5, bearing: 220, followers: 203, discoverable: true },
  { id: "sample-karan", handle: "karan_m", bio: "Gym meals and filter coffee", km: 4, bearing: 300, followers: 17, discoverable: true },
  { id: "sample-meena", handle: "meena.t", bio: "Bakes on Sundays", km: 7, bearing: 90, followers: 76, discoverable: true },
  { id: "sample-ravi", handle: "ravi_south", bio: "South Indian breakfast tour", km: 12, bearing: 180, followers: 9, discoverable: true },
  { id: "sample-hidden", handle: "quiet_cook", bio: "Not on the map. Find me by handle", km: 0, bearing: 0, followers: 31, discoverable: false },
] as const;
const sampleId = (id: string) => id.startsWith("sample-");
function offset(pin: Pin, km: number, bearingDeg: number): Pin {
  const b = (bearingDeg * Math.PI) / 180;
  return { lat: pin.lat + (km * Math.cos(b)) / 111.32, lng: pin.lng + (km * Math.sin(b)) / (111.32 * Math.max(0.2, Math.cos((pin.lat * Math.PI) / 180))) };
}

type Remote = { user_id: string; handle: string; bio: string; following: boolean; follower_count: number | string; discoverable?: boolean; dist_km?: number | string; pin_lat?: number | string; pin_lng?: number | string; has_status?: boolean };
const fromRemote = (r: Remote): Person => ({
  id: r.user_id, handle: r.handle, bio: r.bio || "", following: Boolean(r.following), followerCount: Number(r.follower_count ?? 0), discoverable: r.discoverable,
  distanceKm: r.dist_km != null ? Number(r.dist_km) : undefined, pin: r.pin_lat != null && r.pin_lng != null ? { lat: Number(r.pin_lat), lng: Number(r.pin_lng) } : undefined, hasStatus: r.has_status,
});

export function usePeople(user: PeopleUser, viewer: { latitude?: number; longitude?: number }) {
  const [mode, setMode] = useState<"loading" | "remote" | "local">("loading");
  const [local, setLocal] = useState<LocalPeople>(EMPTY);
  const [remoteFollowing, setRemoteFollowing] = useState<Set<string>>(new Set());
  const [remoteDiscoverable, setRemoteDiscoverable] = useState(false);
  const [counts, setCounts] = useState<FollowCounts>({ followers: 0, following: 0 });
  const localRef = useRef(local); localRef.current = local;
  const { email, userId, role } = user;
  const viewerPin = useMemo<Pin | null>(() => (Number.isFinite(viewer.latitude) && Number.isFinite(viewer.longitude) ? { lat: viewer.latitude as number, lng: viewer.longitude as number } : null), [viewer.latitude, viewer.longitude]);

  const loadCounts = useCallback(async () => {
    const sb = getSupabaseBrowserClient();
    if (!sb) return false;
    const res = await sb.rpc("my_follow_counts").single();
    if (res.error || !res.data) return false;
    const row = res.data as { followers: number | string; following: number | string };
    setCounts({ followers: Number(row.followers), following: Number(row.following) });
    return true;
  }, []);

  useEffect(() => {
    if (!email || role !== "customer") return;
    let cancelled = false;
    setLocal(readLocal(email));
    (async () => {
      const sb = getSupabaseBrowserClient();
      if (!sb || !isLiveSupabaseMode() || !userId) { if (!cancelled) setMode("local"); return; }
      const ok = await loadCounts();
      if (cancelled) return;
      if (!ok) { setMode("local"); return; }                         // V9_3_PEOPLE_STATUS.sql not applied yet
      const [following, me] = await Promise.all([sb.rpc("list_people", { p_kind: "following" }), sb.rpc("my_discoverable")]);
      if (cancelled) return;
      setRemoteFollowing(new Set(((following.data || []) as Remote[]).map((r) => r.user_id)));
      // my_discoverable() comes with V9_4; before that, read the column directly
      const discoverableNow = me.error ? Boolean((await sb.from("social_profiles").select("discoverable").eq("user_id", userId).maybeSingle()).data?.discoverable) : me.data === true;
      setRemoteDiscoverable(discoverableNow);
      setMode("remote");
    })().catch(() => { if (!cancelled) setMode("local"); });
    return () => { cancelled = true; };
  }, [email, userId, role, loadCounts]);

  const persist = useCallback((next: LocalPeople) => { setLocal(next); writeLocal(email, next); }, [email]);

  const myId = localPersonId(email || "");
  const [registry, setRegistry] = useState<Record<string, RegistryEntry>>({});
  // keep this account's entry in the shared demo list current
  useEffect(() => {
    if (mode !== "local" || !email) return;
    const next = { ...readRegistry(), [myId]: { handle: user.handle || email.split("@")[0], bio: user.bio || "", discoverable: local.discoverable, pin: local.pin, following: local.following } };
    writeRegistry(next); setRegistry(next);
  }, [mode, email, myId, user.handle, user.bio, local.discoverable, local.pin, local.following]);

  /** Sample people and other local accounts, placed around the customer (local mode only). */
  const samples = useMemo<Person[]>(() => {
    if (mode !== "local") return [];
    const fixed = SAMPLE.map((s) => {
      const pin = viewerPin && s.discoverable ? coarsePin(offset(viewerPin, s.km, s.bearing)) : undefined;
      const dist = viewerPin && pin ? halfKm(distanceKm(viewerPin, pin)) : undefined;
      const extra = Object.values(registry).filter((r) => r.following.includes(s.id)).length;
      return { id: s.id, handle: s.handle, bio: s.bio, following: local.following.includes(s.id), followerCount: s.followers + extra, discoverable: s.discoverable, distanceKm: dist, pin, hasStatus: false, sample: true } as Person;
    });
    const others = Object.entries(registry).filter(([id]) => id !== myId).map(([id, r]) => {
      const dist = viewerPin && r.pin ? halfKm(distanceKm(viewerPin, r.pin)) : undefined;
      return { id, handle: r.handle, bio: r.bio, following: local.following.includes(id), followerCount: Object.values(registry).filter((x) => x.following.includes(id)).length, discoverable: r.discoverable, distanceKm: r.discoverable ? dist : undefined, pin: r.discoverable ? r.pin : undefined, hasStatus: false } as Person;
    });
    return [...fixed, ...others];
  }, [mode, viewerPin, local.following, registry, myId]);

  const followingIds = useMemo(() => (mode === "remote" ? remoteFollowing : new Set(local.following)), [mode, remoteFollowing, local.following]);
  const discoverable = mode === "remote" ? remoteDiscoverable : local.discoverable;
  const followCounts = useMemo<FollowCounts>(() => (mode === "remote" ? counts : { followers: Object.entries(registry).filter(([id, r]) => id !== myId && r.following.includes(myId)).length, following: local.following.length }), [mode, counts, local, registry, myId]);

  const search = useCallback(async (query: string): Promise<Person[]> => {
    if (!searchReady(query)) return [];
    if (mode === "remote") {
      const res = await getSupabaseBrowserClient()?.rpc("search_people", { p_query: query, p_limit: 20 });
      if (res?.error) throw new Error(res.error.message);
      return ((res?.data || []) as Remote[]).map((r) => ({ ...fromRemote(r), following: followingIds.has(r.user_id) || Boolean(r.following) }));
    }
    return samples.filter((p) => handleMatches(p.handle, query)).map((p) => ({ ...p, distanceKm: undefined, pin: undefined }));
  }, [mode, samples, followingIds]);

  const nearby = useCallback(async (radiusKm: number, query = ""): Promise<Person[]> => {
    if (!viewerPin) return [];
    if (mode === "remote") {
      const res = await getSupabaseBrowserClient()?.rpc("people_nearby", { p_lat: viewerPin.lat, p_lng: viewerPin.lng, p_radius_km: radiusKm, p_query: query || null, p_limit: 60 });
      if (res?.error) throw new Error(res.error.message);
      return ((res?.data || []) as Remote[]).map((r) => ({ ...fromRemote(r), following: followingIds.has(r.user_id) || Boolean(r.following) }));
    }
    const q = query.trim();
    return samples.filter((p) => p.discoverable && p.pin && (p.distanceKm ?? Infinity) <= radiusKm && (!q || handleMatches(p.handle, q))).sort((a, b) => (a.distanceKm ?? 0) - (b.distanceKm ?? 0));
  }, [mode, viewerPin, samples, followingIds]);

  const follow = useCallback(async (id: string) => {
    if (followingIds.size >= MAX_FOLLOWING) throw new Error(`You can follow up to ${MAX_FOLLOWING.toLocaleString("en-IN")} people`);
    if (mode === "remote") {
      setRemoteFollowing((s) => new Set(s).add(id)); setCounts((c) => ({ ...c, following: c.following + 1 }));
      const res = await getSupabaseBrowserClient()?.rpc("follow_person", { p_user: id });
      if (res?.error) { setRemoteFollowing((s) => { const n = new Set(s); n.delete(id); return n; }); setCounts((c) => ({ ...c, following: Math.max(0, c.following - 1) })); throw new Error(res.error.message); }
      return;
    }
    persist({ ...localRef.current, following: [...new Set([...localRef.current.following, id])] });
  }, [mode, followingIds, persist]);

  const unfollow = useCallback(async (id: string) => {
    if (mode === "remote") {
      setRemoteFollowing((s) => { const n = new Set(s); n.delete(id); return n; }); setCounts((c) => ({ ...c, following: Math.max(0, c.following - 1) }));
      const res = await getSupabaseBrowserClient()?.rpc("unfollow_person", { p_user: id });
      if (res?.error) { setRemoteFollowing((s) => new Set(s).add(id)); throw new Error(res.error.message); }
      return;
    }
    persist({ ...localRef.current, following: localRef.current.following.filter((x) => x !== id) });
  }, [mode, persist]);

  /** Appear on (or leave) the map. Only a coarse position is stored, never the exact delivery pin. */
  const setDiscoverable = useCallback(async (on: boolean) => {
    if (on && !viewerPin) throw new Error("Set your delivery location first so people nearby can find you");
    if (mode === "remote") {
      const res = await getSupabaseBrowserClient()?.rpc("set_discoverable", { p_on: on, p_lat: viewerPin?.lat ?? null, p_lng: viewerPin?.lng ?? null });
      if (res?.error) throw new Error(res.error.message);
      setRemoteDiscoverable(on); return;
    }
    persist({ ...localRef.current, discoverable: on, pin: on && viewerPin ? coarsePin(viewerPin) : undefined });
  }, [mode, viewerPin, persist]);

  const list = useCallback(async (kind: "followers" | "following"): Promise<Person[]> => {
    if (mode === "remote") {
      const res = await getSupabaseBrowserClient()?.rpc("list_people", { p_kind: kind });
      if (res?.error) throw new Error(res.error.message);
      return ((res?.data || []) as Remote[]).map((r) => ({ ...fromRemote(r), followerCount: 0 }));
    }
    const ids = kind === "following" ? local.following : Object.entries(registry).filter(([id, r]) => id !== myId && r.following.includes(myId)).map(([id]) => id);
    return samples.filter((p) => ids.includes(p.id)).map((p) => ({ ...p, distanceKm: undefined, pin: undefined }));
  }, [mode, local, samples, registry, myId]);

  return { mode, followingIds, followCounts, discoverable, hasPin: Boolean(viewerPin), viewerPin, search, nearby, follow, unfollow, setDiscoverable, list, samplesAvailable: samples.length > 0, isSample: sampleId, myId, localPeople: samples };
}

export type PeopleApi = ReturnType<typeof usePeople>;
