"use client";
// Public social profile + account hub (Profile tab), and the public vendor
// profile that opens from vendor cards across the app.
import { useState } from "react";
import type * as React from "react";
import Image from "next/image";
import { BadgeCheck, CalendarDays, ClipboardCheck, Heart, HelpCircle, ListChecks, LogOut, Package, ShoppingCart, TicketCheck, UserRound } from "lucide-react";
import { toast } from "sonner";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { claimedPercent, discountPercent, dropDisplayStatus, type FoodDrop } from "@/lib/food-drops";
import type { Product, V3State } from "@/components/sheplates-v3";
import type { SocialApi } from "@/lib/social";
import { Avatar, EmptyState, PhotoTile, SegTabs, Stars, closesIn, money, priceOf, shortArea, useTicker, vendorPhoto, vendorRating } from "./kit";
import { vendorDistanceKm } from "./discover";
import type { FoodShort } from "@/lib/food-shorts";
import { ShortThumb } from "./shorts";
import { DiscoverCard, FollowListDialog, FollowRequestsPanel } from "./people";
import type { PeopleApi } from "@/lib/people";
import type { StatusesApi } from "@/lib/statuses";

type Coords = { latitude?: number; longitude?: number; address?: string };
function EditProfileDialog({ open, onClose, social, name }: { open: boolean; onClose: () => void; social: SocialApi; name: string }) {
  const [handle, setHandle] = useState(social.profile.handle); const [bio, setBio] = useState(social.profile.bio); const [busy, setBusy] = useState(false);
  async function save() {
    setBusy(true);
    try { await social.saveProfile({ handle, bio }); toast.success("Profile updated"); onClose(); }
    catch (error) { toast.error(error instanceof Error ? error.message : "Profile could not be saved"); } finally { setBusy(false); }
  }
  return <Dialog open={open} onOpenChange={(v) => !v && onClose()}><DialogContent className="rounded-[28px] sm:max-w-md">
    <DialogHeader><DialogTitle className="text-lg font-black">Edit profile</DialogTitle><DialogDescription>Only your name, handle and bio are public. Diet, allergies and addresses never appear here.</DialogDescription></DialogHeader>
    <div className="flex items-center gap-3"><Avatar name={name} size={56} /><div className="text-sm font-black">{name}</div></div>
    <label className="block text-xs font-black uppercase tracking-[.1em] text-stone-500">Handle<div className="mt-1.5 flex items-center rounded-xl border border-stone-200 px-3 focus-within:border-[#e0194f]"><span className="text-stone-400">@</span><input value={handle} onChange={(e) => setHandle(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ""))} maxLength={24} aria-label="Handle" className="h-11 min-w-0 flex-1 bg-transparent px-1 text-sm font-bold normal-case tracking-normal text-stone-800 outline-none" /></div></label>
    <label className="block text-xs font-black uppercase tracking-[.1em] text-stone-500">Bio<textarea value={bio} onChange={(e) => setBio(e.target.value)} maxLength={160} rows={3} aria-label="Bio" placeholder="Exploring local food & home kitchens" className="mt-1.5 w-full rounded-xl border border-stone-200 p-3 text-sm font-medium normal-case tracking-normal text-stone-800 outline-none focus:border-[#e0194f]" /><span className="mt-1 block text-right text-[10px] font-bold text-stone-400">{bio.length}/160</span></label>
    <button type="button" disabled={busy} onClick={() => void save()} className="h-12 w-full rounded-full bg-[#e0194f] font-black text-white disabled:opacity-50">{busy ? "Saving…" : "Save changes"}</button>
  </DialogContent></Dialog>;
}

export function ProfileTab({ session, state, setState, social, people, statuses, onNavigate, onSetLocation, onReplayTour, onSignOut }: {
  session: { name: string; email: string }; state: V3State; setState: React.Dispatch<React.SetStateAction<V3State>>; social: SocialApi; people: PeopleApi; statuses: StatusesApi; onNavigate: (label: string) => void; onSetLocation: () => void; onReplayTour: () => void; onSignOut: () => void;
}) {
  const [editing, setEditing] = useState(false); const [list, setList] = useState<null | "followers" | "following">(null); const [privacyBusy, setPrivacyBusy] = useState(false);
  const customer = state.customers.find((c) => c.email === session.email);
  async function setAccountPrivacy(privateAccount: boolean) {
    setPrivacyBusy(true);
    try {
      await people.setPrivateAccount(privateAccount);
      setState((current) => ({ ...current, customers: current.customers.map((item) => item.email === session.email ? { ...item, privateAccount } : item) }));
      toast.success(privateAccount ? "Private account enabled" : "Public account enabled");
    } catch (error) { toast.error(error instanceof Error ? error.message : "Account privacy could not be updated"); }
    finally { setPrivacyBusy(false); }
  }
  const myReviews = state.reviews.filter((r) => r.customerEmail === session.email);
  const links: [string, React.ComponentType<{ className?: string }>][] = [["Profile & food", UserRound], ["Wishlist", Heart], ["Orders", Package], ["My schedule", CalendarDays], ["Monthly requirement", ListChecks], ["My quotations", ClipboardCheck], ["Ticket centre", TicketCheck]];
  const active = statuses.mine.length;
  return <div className="mx-auto max-w-3xl space-y-5">
    <section className="rounded-[28px] bg-white p-5 shadow-sm ring-1 ring-stone-200/70">
      <div className="flex items-start gap-4"><Avatar name={session.name} size={76} ring />
        <div className="min-w-0 flex-1"><h1 className="truncate text-xl font-black tracking-[-.02em]">{session.name}</h1><div className="text-sm font-bold text-stone-500">@{social.profile.handle}</div>
          <div className="mt-1 text-xs font-bold text-stone-500">{shortArea(customer?.address)}</div></div></div>
      <p className="mt-3 text-sm leading-6 text-stone-600">{social.profile.bio || "Add a bio so neighbours know what you love to eat."}</p>
      <div className="mt-4 grid grid-cols-3 gap-2 text-center" data-testid="profile-stats">
        <button type="button" onClick={() => setList("followers")} className="rounded-xl py-1 transition hover:bg-stone-50" aria-label={`Followers ${people.followCounts.followers}`}><div className="text-lg font-black">{people.followCounts.followers}</div><div className="text-[11px] font-bold text-stone-500">Followers</div></button>
        <button type="button" onClick={() => setList("following")} className="rounded-xl py-1 transition hover:bg-stone-50" aria-label={`Following ${people.followCounts.following}`}><div className="text-lg font-black">{people.followCounts.following}</div><div className="text-[11px] font-bold text-stone-500">Following</div></button>
        <div className="py-1"><div className="text-lg font-black">{social.followed.length}</div><div className="text-[11px] font-bold text-stone-500">Vendors</div></div>
      </div>
      <button type="button" onClick={() => setEditing(true)} className="mt-4 h-11 w-full rounded-xl border border-stone-300 text-sm font-black transition hover:border-[#e0194f] hover:text-[#e0194f]">Edit Profile</button>
    </section>
    <section className="flex items-center justify-between gap-4 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-stone-200/70" aria-label="Account privacy">
      <div className="min-w-0"><h2 className="text-sm font-black">{people.privateAccount ? "Private account" : "Public account"}</h2><p className="mt-1 text-xs leading-5 text-stone-500">{people.privateAccount ? "People must request to follow you. You approve each request." : "Other customers can follow you without approval."}</p></div>
      <button type="button" role="switch" aria-label="Private account" aria-checked={people.privateAccount} disabled={privacyBusy} onClick={() => void setAccountPrivacy(!people.privateAccount)} className={`relative h-7 w-12 shrink-0 rounded-full transition disabled:opacity-60 ${people.privateAccount ? "bg-[#e0194f]" : "bg-stone-300"}`}><span className={`absolute top-0.5 size-6 rounded-full bg-white shadow transition-all ${people.privateAccount ? "left-[22px]" : "left-0.5"}`} /></button>
    </section>
    <FollowRequestsPanel people={people} />
    <section className="flex items-center justify-between gap-3 rounded-[22px] bg-white p-4 shadow-sm ring-1 ring-stone-200/70" aria-label="Your status">
      <div className="min-w-0"><h2 className="text-sm font-black">Your status</h2><p className="mt-0.5 text-xs font-bold text-stone-500">{active ? `${active} active. Each disappears after 24 hours.` : "Share a photo or a 30 second video. It disappears after 24 hours."}</p></div>
      <button type="button" onClick={() => onNavigate("Stories")} className="shrink-0 rounded-full bg-[#e0194f] px-4 py-2 text-xs font-black text-white">{active ? "View" : "Add status"}</button>
    </section>
    <DiscoverCard people={people} onSetLocation={onSetLocation} />
    {myReviews.length > 0 && <section className="space-y-2" aria-label="My reviews"><h2 className="px-1 text-xs font-black uppercase tracking-[.14em] text-stone-400">My reviews</h2>{myReviews.map((r) => { const product = state.products.find((p) => p.id === r.productId); return <div key={r.id} className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-stone-200/70"><div className="flex items-center justify-between gap-2"><b className="truncate">{product?.name || "Product"}</b><Stars value={r.rating} /></div><p className="mt-1 text-sm text-stone-600">{r.comment || "No written feedback."}</p></div>; })}</section>}
    <section className="rounded-[28px] bg-white p-2 shadow-sm ring-1 ring-stone-200/70" aria-label="Account">
      <h2 className="px-3 pb-1 pt-3 text-xs font-black uppercase tracking-[.14em] text-stone-400">Account</h2>
      {links.map(([label, Icon]) => <button key={label} type="button" onClick={() => onNavigate(label)} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition hover:bg-stone-50"><span className="grid size-9 place-items-center rounded-xl bg-[#fff0f4] text-[#e0194f]"><Icon className="size-[18px]" /></span>{label}</button>)}
      <button type="button" onClick={() => onNavigate("Cart")} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition hover:bg-stone-50"><span className="grid size-9 place-items-center rounded-xl bg-[#fff0f4] text-[#e0194f]"><ShoppingCart className="size-[18px]" /></span>Cart</button>
      <button type="button" onClick={onReplayTour} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold transition hover:bg-stone-50"><span className="grid size-9 place-items-center rounded-xl bg-stone-100 text-stone-500"><HelpCircle className="size-[18px]" /></span>Help · Product tour</button>
      <button type="button" onClick={onSignOut} className="flex w-full items-center gap-3 rounded-2xl px-3 py-3 text-left text-sm font-bold text-red-600 transition hover:bg-red-50"><span className="grid size-9 place-items-center rounded-xl bg-red-50"><LogOut className="size-[18px]" /></span>Sign out</button>
    </section>
    {editing && <EditProfileDialog open onClose={() => setEditing(false)} social={social} name={session.name} />}
    <FollowListDialog open={list !== null} kind={list || "followers"} onClose={() => setList(null)} people={people} />
  </div>;
}

/* ---------- Public vendor profile ---------- */

const VENDOR_TABS = ["Menu", "New Products", "Subscriptions", "Food Drops", "Shorts", "Reviews"] as const;
type VendorTabKey = (typeof VENDOR_TABS)[number];

function ProductRow({ product, state, onAdd, onPlan, isNew, planLabel = "Plan" }: { product: Product; state: V3State; onAdd: (p: Product) => void; onPlan: (p: Product) => void; isNew?: boolean; planLabel?: string }) {
  return <div className="flex flex-wrap items-center gap-x-3 gap-y-2 rounded-2xl border border-stone-200/70 bg-white p-2.5">
    <PhotoTile imageUrl={product.imageUrl} category={product.category} className="size-16 shrink-0 rounded-xl" emojiSize={28}>{isNew && <span className="absolute left-0 top-0 rounded-br-lg bg-[#e0194f] px-1.5 py-0.5 text-[8px] font-black uppercase text-white">New</span>}</PhotoTile>
    <div className="min-w-[8rem] flex-1"><div className="text-sm font-black leading-snug">{product.name}</div><div className="text-xs text-stone-500">{product.baseUnit}</div><div className="mt-0.5 text-sm font-black text-[#e0194f]">{money(priceOf(product, state))}</div></div>
    <div className="ml-auto flex shrink-0 gap-1.5"><button type="button" onClick={() => onAdd(product)} className="rounded-full bg-[#e0194f] px-3.5 py-1.5 text-xs font-black text-white">Add</button><button type="button" onClick={() => onPlan(product)} className="rounded-full border border-stone-300 px-3 py-1.5 text-xs font-black">{planLabel}</button></div>
  </div>;
}

function VendorDropRow({ drop, onClaim }: { drop: FoodDrop; onClaim: (d: FoodDrop, q: number) => Promise<void> }) {
  useTicker(); const [busy, setBusy] = useState(false);
  return <div className="flex items-center gap-3 rounded-2xl border border-stone-200/70 bg-white p-3"><div className="min-w-0 flex-1"><div className="truncate text-sm font-black">{drop.title}</div><div className="mt-0.5 text-xs font-bold text-stone-500">Closes in {closesIn(drop.endsAt)} · {drop.remainingQuantity} left · {discountPercent(drop)}% off</div><div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-stone-100"><div className="h-full bg-[#e0194f]" style={{ width: `${claimedPercent(drop)}%` }} /></div></div>
    <div className="text-right"><div className="font-black">{money(drop.dropPrice)}</div><button type="button" disabled={busy} onClick={async () => { setBusy(true); try { await onClaim(drop, 1); } finally { setBusy(false); } }} className="mt-1 rounded-full bg-[#e0194f] px-4 py-1.5 text-xs font-black text-white disabled:opacity-50">Add +</button></div></div>;
}

export function VendorProfileDialog({ vendorId, onClose, state, social, profile, onAdd, onPlan, onClaimDrop, shorts = [], onOpenShorts }: {
  shorts?: FoodShort[]; onOpenShorts?: (list: FoodShort[], index: number) => void;
  vendorId: string | null; onClose: () => void; state: V3State; social: SocialApi; profile: Coords;
  onAdd: (p: Product) => void; onPlan: (p: Product) => void; onClaimDrop: (d: FoodDrop, q: number) => Promise<void>;
}) {
  const [tab, setTab] = useState<VendorTabKey>("Menu");
  const vendor = vendorId ? state.vendors.find((v) => v.id === vendorId) : undefined;
  if (!vendor) return null;
  const products = state.products.filter((p) => p.vendorId === vendor.id && p.active);
  const drops = state.foodDrops.filter((d) => d.vendorId === vendor.id && dropDisplayStatus(d) === "live");
  const productIds = new Set(products.map((p) => p.id)); const reviews = state.reviews.filter((r) => productIds.has(r.productId)).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  const rating = vendorRating(state, vendor.id); const distance = vendorDistanceKm(profile, vendor); const following = social.followed.includes(vendor.id);
  const photo = vendorPhoto(state, vendor);
  return <Dialog open onOpenChange={(v) => !v && onClose()}><DialogContent className="max-h-[94vh] gap-0 overflow-y-auto overflow-x-hidden rounded-[28px] p-0 sm:max-w-3xl [&>*]:min-w-0">
    <DialogHeader className="sr-only"><DialogDescription>{vendor.businessName} — public vendor profile</DialogDescription></DialogHeader>
    <div className="relative h-40 sm:h-52">{vendor.bannerUrl ? <Image src={vendor.bannerUrl} alt="" fill unoptimized sizes="(max-width: 768px) 100vw, 768px" className="object-cover" /> : <PhotoTile category={vendor.category} className="h-full w-full" emojiSize={90} />}</div>
    <div className="px-5 pb-5"><div className="-mt-10 flex items-end gap-3"><PhotoTile imageUrl={photo} category={vendor.category} className="size-20 shrink-0 rounded-2xl border-4 border-white shadow-lg" emojiSize={34} /></div>
      <div className="mt-3 flex flex-wrap items-start justify-between gap-3"><div className="min-w-0"><DialogTitle asChild><h2 className="flex items-center gap-1.5 text-xl font-black leading-tight tracking-[-.02em]">{vendor.businessName}{vendor.verification === "Verified" && <BadgeCheck className="size-5 text-sky-500" aria-label="Verified" />}</h2></DialogTitle>
        <div className="mt-0.5 text-sm font-bold text-stone-500">{vendor.category} · {shortArea(vendor.address)}{distance !== null ? ` · ${distance.toFixed(1)} km` : ""}</div>
        <div className="mt-1 flex items-center gap-1.5 text-sm font-black">{rating ? <><Stars value={rating.average} /><span>{rating.average.toFixed(1)}</span><span className="font-bold text-stone-400">({rating.count} reviews)</span></> : <span className="text-stone-400">No reviews yet</span>}</div></div>
        <button type="button" aria-pressed={following} onClick={() => void social.toggleFollow(vendor.id).then(() => toast.success(following ? `Unfollowed ${vendor.businessName}` : `Following ${vendor.businessName}`)).catch((e) => toast.error(e instanceof Error ? e.message : "Could not update follow"))} className={`h-11 rounded-full px-7 text-sm font-black transition ${following ? "border border-stone-300 bg-white text-stone-700" : "bg-[#e0194f] text-white shadow-[0_10px_24px_rgba(224,25,79,.3)]"}`}>{following ? "Following" : "Follow"}</button></div>
      <div className="mt-3 flex flex-wrap gap-2">{vendor.verification === "Verified" && <span className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-black text-emerald-700">FSSAI Verified</span>}{vendor.category === "Home food" && <span className="rounded-full bg-amber-50 px-3 py-1 text-xs font-black text-amber-700">Home Food</span>}{vendor.delivery && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">Delivery</span>}{vendor.pickup && <span className="rounded-full bg-stone-100 px-3 py-1 text-xs font-black text-stone-600">Pickup</span>}<span className={`rounded-full px-3 py-1 text-xs font-black ${vendor.openToday ? "bg-emerald-50 text-emerald-700" : "bg-stone-100 text-stone-500"}`}>{vendor.openToday ? "Open now" : "Closed today"}</span></div>
      <SegTabs tabs={(shorts.length ? VENDOR_TABS : VENDOR_TABS.filter((t) => t !== "Shorts")) as readonly VendorTabKey[]} value={tab} onChange={setTab} className="mt-4" />
      <div className="mt-4 space-y-2.5">
        {tab === "Menu" && (products.length ? <><h3 className="text-sm font-black">Today&apos;s Menu ({products.length})</h3>{products.map((p) => <ProductRow key={p.id} product={p} state={state} onAdd={onAdd} onPlan={onPlan} />)}</> : <EmptyState emoji="🍽️" title="Nothing on the menu today" body="This vendor hasn&apos;t published any items right now." />)}
        {tab === "New Products" && (products.length ? products.slice(0, 4).map((p) => <ProductRow key={p.id} product={p} state={state} onAdd={onAdd} onPlan={onPlan} isNew />) : <EmptyState emoji="✨" title="No new products" body="Newly added items appear here first." />)}
        {tab === "Subscriptions" && (products.length ? <><p className="text-xs font-bold text-stone-500">Pick any item and set how often you want it — daily, weekly or on custom days.</p>{products.map((p) => <ProductRow key={p.id} product={p} state={state} onAdd={onAdd} onPlan={onPlan} planLabel="Subscribe" />)}</> : <EmptyState emoji="🔁" title="No subscription items" body="Items you can subscribe to appear here." />)}
        {tab === "Food Drops" && (drops.length ? drops.map((d) => <VendorDropRow key={d.id} drop={d} onClaim={onClaimDrop} />) : <EmptyState emoji="⚡" title="No live drops" body="Follow this vendor to hear first when they post surplus or a limited batch." />)}
        {tab === "Shorts" && <div className="grid grid-cols-2 gap-3 sm:grid-cols-3" data-testid="vendor-shorts">{shorts.map((s, i) => <ShortThumb key={s.id} short={s} onOpen={() => { onClose(); onOpenShorts?.(shorts, i); }} />)}</div>}
        {tab === "Reviews" && (reviews.length ? reviews.slice(0, 20).map((r) => { const product = state.products.find((p) => p.id === r.productId); const verified = !/^demo\d+@sheplates\.demo$/.test(r.customerEmail); return <div key={r.id} className="rounded-2xl border border-stone-200/70 bg-white p-3.5"><div className="flex items-center justify-between gap-2"><div className="flex items-center gap-2"><Avatar name={r.customerName} size={30} /><div><div className="text-sm font-black">{r.customerName}</div><div className="text-[11px] font-bold text-stone-400">{product?.name || "Product"} · {r.createdAt}</div></div></div><Stars value={r.rating} /></div>{verified && <span className="mt-2 inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700"><BadgeCheck className="size-3" />Verified Purchase</span>}<p className="mt-1.5 text-sm text-stone-600">{r.comment || "No written feedback."}</p></div>; }) : <EmptyState emoji="⭐" title="No reviews yet" body="Reviews appear after customers receive an order." />)}
      </div>
    </div>
  </DialogContent></Dialog>;
}
