import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const app = await readFile(new URL("../components/sheplates-v3.tsx", import.meta.url), "utf8");

test("a vendor who applies in live mode is saved to the database, not only to the browser", () => {
  const onboarding = app.slice(app.indexOf("function VendorOnboarding("), app.indexOf("function VendorOnboarding(") + 6000);
  assert.match(onboarding, /let vendorId = id\("VEN"\)/);
  assert.match(onboarding, /vendorId = await submitLiveVendorApplication\(/);
});

test("customers have no Cancel button; Operations keeps the cancellation queue for Support-led changes", () => {
  assert.doesNotMatch(app, /onClick=\{\(\) => cancel\(order\)\}/);
  assert.doesNotMatch(app, /change\(schedule, "cancel"\)/);
  assert.match(app, /if \(active === "Cancellations"\)/);
});

test("the menus list P0 Connect once for Operations and Super Admin, and each role is defined once", () => {
  const nav = app.slice(app.indexOf("const nav: Record<Role, string[]> = {"), app.indexOf("const navIcons"));
  for (const role of ["customer", "vendor", "operations", "admin"]) {
    assert.equal((nav.match(new RegExp(`^  ${role}: \\[`, "gm")) || []).length, 1, `${role} is defined once`);
  }
  assert.match(nav, /operations: \[[^\]]*"P0 Connect vendors"/);
  assert.match(nav, /admin: \[[^\]]*"P0 Connect vendors"/);
  assert.doesNotMatch(nav, /Vendor workspace/);
});
