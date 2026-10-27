import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
import {
  dropDisplayStatus,
  formatCountdown,
  foodDropSchedule,
  isFoodDropPurchaseWindow,
  nextFoodDropWindow,
} from "../lib/food-drops.ts";

const drop = {
  id: "drop-1",
  vendorId: "vendor-1",
  productId: "product-1",
  title: "Evening surplus",
  dropPrice: 50,
  originalPrice: 100,
  totalQuantity: 10,
  remainingQuantity: 5,
  startsAt: "2026-10-26T14:30:00.000Z",
  endsAt: "2026-10-27T18:30:00.000Z",
  status: "active",
};

test("Food Drops are scheduled before 8 PM and live from 8 PM through 11:59 PM IST", () => {
  assert.equal(dropDisplayStatus(drop, new Date("2026-10-27T14:29:59.000Z")), "scheduled");
  assert.equal(dropDisplayStatus(drop, new Date("2026-10-27T14:30:00.000Z")), "live");
  assert.equal(dropDisplayStatus(drop, new Date("2026-10-27T18:29:59.000Z")), "live");
  assert.equal(isFoodDropPurchaseWindow(new Date("2026-10-27T18:29:59.000Z")), true);
});

test("midnight closes sales and the next day reopens at 8 PM IST", () => {
  const midnight = new Date("2026-10-27T18:30:00.000Z");
  assert.equal(dropDisplayStatus(drop, midnight), "scheduled");
  assert.equal(isFoodDropPurchaseWindow(midnight), false);
  assert.equal(dropDisplayStatus(drop, new Date("2026-10-28T14:30:00.000Z")), "live");
});

test("new drops are scheduled for the next daily window or go live immediately during it", () => {
  const beforeOpening = nextFoodDropWindow(new Date("2026-10-27T14:29:59.000Z"));
  assert.equal(beforeOpening.startsAt.toISOString(), "2026-10-27T14:30:00.000Z");
  assert.equal(beforeOpening.endsAt.toISOString(), "2026-10-27T18:30:00.000Z");

  const whileOpen = nextFoodDropWindow(new Date("2026-10-27T16:00:00.000Z"));
  assert.equal(whileOpen.startsAt.toISOString(), "2026-10-27T16:00:00.000Z");
  assert.equal(whileOpen.endsAt.toISOString(), "2026-10-27T18:30:00.000Z");
});

test("display schedule rolls to the next evening after midnight", () => {
  const schedule = foodDropSchedule(drop, new Date("2026-10-27T18:30:00.000Z"));
  assert.equal(schedule.startsAt.toISOString(), "2026-10-28T14:30:00.000Z");
  assert.equal(schedule.endsAt.toISOString(), "2026-10-28T18:30:00.000Z");
});

test("live countdown reports seconds and reaches zero at midnight", () => {
  const closesAt = "2026-10-27T18:30:00.000Z";
  assert.equal(formatCountdown(closesAt, new Date("2026-10-27T18:29:59.000Z")), "00:01");
  assert.equal(formatCountdown(closesAt, new Date("2026-10-27T18:30:00.000Z")), "Ended");
});

test("database claim enforcement uses the same IST daily window and atomic stock guard", () => {
  const migration = fs.readFileSync(new URL("../supabase/V9_11_DAILY_FOOD_DROPS.sql", import.meta.url), "utf8");
  assert.match(migration, /Asia\/Kolkata/);
  assert.match(migration, /::time >= time '20:00'/);
  assert.match(migration, /clock_timestamp\(\)/);
  assert.match(migration, /remaining_quantity >= p_quantity/);
  assert.match(migration, /before insert or update of starts_at, ends_at/i);
});
