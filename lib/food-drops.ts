// Food Drops — vendor-created, time-limited offers on an existing product.
// Pure, deterministic helpers only: no AI, no randomness. The actual
// overselling guard lives in the database (see
// supabase/V8_2_FOOD_DROPS.sql's claim_food_drop()), not here — this module
// only formats and derives display state from whatever quantity/timestamps
// the server already returned.

export type FoodDrop = {
  id: string;
  vendorId: string;
  productId: string;
  title: string;
  description?: string;
  dropPrice: number;
  originalPrice: number;
  totalQuantity: number;
  remainingQuantity: number;
  startsAt: string;
  endsAt: string;
  status: "active" | "cancelled";
};

export type FoodDropClaim = {
  id: string;
  dropId: string;
  customerEmail: string;
  quantity: number;
  unitPrice: number;
  totalPrice: number;
  claimedAt: string;
};

export type DropDisplayStatus = "scheduled" | "live" | "sold_out" | "ended" | "cancelled";

export function dropDisplayStatus(drop: FoodDrop, now: Date = new Date()): DropDisplayStatus {
  if (drop.status === "cancelled") return "cancelled";
  const t = now.getTime();
  if (t < new Date(drop.startsAt).getTime()) return "scheduled";
  if (t > new Date(drop.endsAt).getTime()) return "ended";
  if (drop.remainingQuantity <= 0) return "sold_out";
  return "live";
}

export function discountPercent(drop: Pick<FoodDrop, "dropPrice" | "originalPrice">): number {
  if (drop.originalPrice <= 0) return 0;
  return Math.round((1 - drop.dropPrice / drop.originalPrice) * 100);
}

export function claimedPercent(drop: Pick<FoodDrop, "totalQuantity" | "remainingQuantity">): number {
  if (drop.totalQuantity <= 0) return 0;
  return Math.round(((drop.totalQuantity - drop.remainingQuantity) / drop.totalQuantity) * 100);
}

/** "2h 14m", "14m 32s", "38s" or "Ended" — deliberately coarse (drops to the
 * next unit rather than showing every field at once) so a live countdown
 * reads at a glance instead of as a ticking digital clock. */
export function formatCountdown(targetIso: string, now: Date = new Date()): string {
  const ms = new Date(targetIso).getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  if (minutes > 0) return `${minutes}m ${seconds}s`;
  return `${seconds}s`;
}
