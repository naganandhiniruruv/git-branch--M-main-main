// Food Drops — vendor-created, time-limited offers on an existing product.
// Pure, deterministic helpers only: no AI, no randomness. The actual
// overselling guard lives in the database (see
// supabase/V9_11_DAILY_FOOD_DROPS.sql's claim_food_drop()), not here — this module
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

const FOOD_DROP_TIME_ZONE_OFFSET_MS = 330 * 60_000;
const FOOD_DROP_OPEN_HOUR = 20;
const FOOD_DROP_WINDOW_MS = 4 * 60 * 60_000;

function istClock(now: Date) {
  return new Date(now.getTime() + FOOD_DROP_TIME_ZONE_OFFSET_MS);
}

function istOpeningFor(now: Date) {
  const local = istClock(now);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate(), FOOD_DROP_OPEN_HOUR) - FOOD_DROP_TIME_ZONE_OFFSET_MS);
}

function istMidnightAfter(now: Date) {
  const local = istClock(now);
  return new Date(Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate() + 1) - FOOD_DROP_TIME_ZONE_OFFSET_MS);
}

export function isFoodDropPurchaseWindow(now: Date = new Date()): boolean {
  return istClock(now).getUTCHours() >= FOOD_DROP_OPEN_HOUR;
}

export function nextFoodDropWindow(now: Date = new Date()): { startsAt: Date; endsAt: Date } {
  const startsAt = istOpeningFor(now);
  const endsAt = new Date(startsAt.getTime() + FOOD_DROP_WINDOW_MS);
  if (isFoodDropPurchaseWindow(now)) startsAt.setTime(now.getTime());
  return { startsAt, endsAt };
}

export function foodDropSchedule(drop: FoodDrop, now: Date = new Date()): { startsAt: Date; endsAt: Date } {
  if (now.getTime() < new Date(drop.startsAt).getTime()) {
    return { startsAt: new Date(drop.startsAt), endsAt: new Date(drop.endsAt) };
  }
  if (isFoodDropPurchaseWindow(now)) {
    return { startsAt: new Date(drop.startsAt), endsAt: istMidnightAfter(now) };
  }
  const startsAt = istOpeningFor(now);
  return { startsAt, endsAt: new Date(startsAt.getTime() + FOOD_DROP_WINDOW_MS) };
}

export function dropDisplayStatus(drop: FoodDrop, now: Date = new Date()): DropDisplayStatus {
  if (drop.status === "cancelled") return "cancelled";
  if (now.getTime() < new Date(drop.startsAt).getTime()) return "scheduled";
  if (!isFoodDropPurchaseWindow(now)) return "scheduled";
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

/** Displays every second so the daily closing countdown stays live. */
export function formatCountdown(targetIso: string, now: Date = new Date()): string {
  const ms = new Date(targetIso).getTime() - now.getTime();
  if (ms <= 0) return "Ended";
  const totalSeconds = Math.ceil(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const clock = `${String(hours).padStart(2, "0")}:${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
  if (days > 0) return `${days}d ${clock}`;
  if (hours > 0) return clock;
  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}
