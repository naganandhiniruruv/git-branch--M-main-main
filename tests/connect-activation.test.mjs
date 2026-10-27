import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const supabase = await readFile(new URL("../lib/supabase.ts", import.meta.url), "utf8");
const app = await readFile(new URL("../components/sheplates-v3.tsx", import.meta.url), "utf8");

function sourceBetween(source, startText, endText) {
  const start = source.indexOf(startText);
  assert.notEqual(start, -1, `source contains ${startText}`);
  const end = source.indexOf(endText, start);
  assert.notEqual(end, -1, `source contains ${endText}`);
  return source.slice(start, end);
}

test("vendor workspace safely reports the Connect migration prerequisite without breaking old schemas", () => {
  const workspace = sourceBetween(
    supabase,
    "export async function loadLiveVendorWorkspace",
    "export async function loadLiveOperationsWorkspace",
  );
  assert.match(workspace, /connect_enabled,whatsapp_number/);
  assert.match(workspace, /connectCapabilityAvailable\s*=\s*false/);
  assert.match(workspace, /vendor\.error\.code === "42703" \|\| vendor\.error\.code === "PGRST204"/);
  assert.match(workspace, /if \(vendor\.error\) throw vendor\.error/);
});

test("Connect saves update only the existing vendor's capability and required WhatsApp contact", () => {
  const save = sourceBetween(
    supabase,
    "export async function saveLiveVendorConnect",
    "export async function saveLiveVendorPlan",
  );
  assert.match(save, /connect_enabled:\s*true,\s*whatsapp_number:\s*whatsappNumber/);
  assert.match(save, /patch = \{ connect_enabled: false \}/);
  assert.match(save, /\.update\(patch\)\s*\.eq\("id", input\.vendorId\)/);
  assert.match(save, /\.select\("id"\)\s*\.maybeSingle\(\)/);
  assert.doesNotMatch(save, /plan_id|billing_status|vendor_menu_items|profiles/);
  assert.match(save, /migration 20261026000400_connect_vendor_capability\.sql is manually applied/);
});

test("vendor Connect control validates and persists before showing success", () => {
  const component = sourceBetween(app, "function StoreRadius(", "function VerificationView(");
  const saveIndex = component.indexOf("await saveLiveVendorConnect");
  const successIndex = component.indexOf("toast.success(message)", saveIndex);
  assert.notEqual(saveIndex, -1);
  assert.ok(successIndex > saveIndex, "success follows the database write");
  assert.match(component, /disabled=\{!canManageConnect \|\| connectSaving\}/);
  assert.match(component, /vendor\.connectCapabilityAvailable === false/);
  assert.match(component, /normalizeWhatsAppNumber\(connectWhatsapp\)/);
});
