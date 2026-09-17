import type { Page } from "@playwright/test";
import { createClient } from "@supabase/supabase-js";

export const DEMO = {
  customer: { email: "customer@sheplates.demo", password: "Customer@123" },
  vendor: { email: "vendor@sheplates.demo", password: "Vendor@123" },
  operations: { email: "operations@sheplates.demo", password: "Operations@123" },
  admin: { email: "admin@sheplates.demo", password: "Admin@123" },
};

/** Signs in as a customer via the "Customer login" entry and waits for the
 * authenticated shell (or first-login onboarding) to render. Clears any
 * previous session first so tests don't depend on leftover browser state. */
export async function loginAsCustomer(page: Page) {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // The header shows "Customer login" on desktop and just "Sign in" on
  // mobile (sm:hidden / hidden sm:inline), so match either.
  await page.getByRole("button", { name: /Customer login|^Sign in$/ }).click();
  await page.getByLabel("Email").fill(DEMO.customer.email);
  await page.getByLabel("Password").fill(DEMO.customer.password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
}

export async function loginAsStaff(page: Page, who: "vendor" | "operations" | "admin") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  // "Vendor / Team" on desktop, just "Vendor" on mobile.
  await page.getByRole("button", { name: /Vendor/ }).click();
  await page.getByLabel("Email").fill(DEMO[who].email);
  await page.getByLabel("Password").fill(DEMO[who].password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
}

/** Signs out via the in-app button (does NOT clear localStorage) and signs
 * back in as a different demo role — for tests that follow one piece of data
 * (an RFQ, a ticket, a transaction) across roles. The mock local-state blob
 * (`sheplates-v3-state`) is shared across all roles in one browser, so this
 * is how a customer-created RFQ becomes visible to a vendor/operations login
 * in the same test. loginAsCustomer/loginAsStaff would wipe that blob. */
export async function switchTo(page: Page, who: "customer" | "vendor" | "operations" | "admin") {
  const signOut = page.getByRole("button", { name: "Sign out" });
  // Staff headers show "Sign out" directly; the customer header hides it
  // inside the account dropdown/sheet, which must be opened first.
  if (!(await signOut.isVisible().catch(() => false))) {
    await page.locator('[data-tour="account"]:visible, [data-tour="account-mobile"]:visible').first().click();
  }
  await signOut.click();
  // On narrow viewports a stack of "Signed out" toasts (one per switchTo call
  // in a multi-role test) can sit directly over the header's login buttons —
  // sonner's toast history doesn't reliably clear between quick role swaps.
  // The located button is confirmed correct (see the anchored regex below);
  // force the click rather than fight transient decorative overlay elements.
  if (who === "customer") {
    await page.getByRole("button", { name: /^Customer login$|^Sign in$/ }).click({ force: true });
  } else {
    // Anchored: an unanchored /Vendor/ also matches staff sidebar nav items
    // ("Vendor onboarding", "Vendor payments", ...) that can still be present
    // in the DOM for a moment during the sign-out transition.
    await page.getByRole("button", { name: /^Vendor(\s*\/\s*Team)?$/ }).click({ force: true });
  }
  await page.getByLabel("Email").fill(DEMO[who].email);
  await page.getByLabel("Password").fill(DEMO[who].password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
  // Confirm the session is fully established and rendered before reloading —
  // reloading too early can race the Supabase auth write and sign back out.
  if (who === "customer") {
    await page.locator('[data-tour="account"]:visible, [data-tour="account-mobile"]:visible').first().waitFor({ timeout: 15_000 });
  } else {
    await page.getByRole("button", { name: "Sign out" }).waitFor({ timeout: 15_000 });
  }
  // A same-page sign-out/sign-in (no full navigation) leaves the mobile
  // responsive shell — the hamburger drawer in particular — uninitialized on
  // some viewports. A reload is harmless (the Supabase session and the shared
  // local mock-state blob both live in storage that survives it) and matches
  // what a real user gets after any browser refresh.
  await page.reload();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
}

/** Opens the staff sidebar drawer if it's currently a closed hamburger menu
 * (narrow viewports only — on desktop the sidebar is always visible and this
 * button is a harmless no-op toggle). */
export async function openStaffNavIfCollapsed(page: Page) {
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  try {
    // An instant isVisible() check can race a just-completed navigation or
    // reload before the responsive shell finishes settling — wait briefly
    // instead. On desktop the toggle never exists, so this just times out
    // quickly and falls through as the harmless no-op it always was.
    await toggle.waitFor({ state: "visible", timeout: 1500 });
    await toggle.click();
  } catch {
    // Desktop, or the sidebar was already open — nothing to do.
  }
}

/** Resets the product tour's completion state for a demo account directly in
 * the database (profiles.tours_completed), so tour specs get a deterministic
 * "first login" every run instead of depending on whether some earlier run
 * (or manual testing) already dismissed it for that account. Requires
 * SUPABASE_SERVICE_ROLE_KEY — the same env this whole app already needs. */
export async function resetTourCompletion(email: string) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !serviceKey) return;
  const admin = createClient(url, serviceKey, { auth: { persistSession: false } });
  const { data: user } = await admin.auth.admin.listUsers();
  const match = user?.users.find((u) => u.email === email);
  if (!match) return;
  await admin.from("profiles").update({ tours_completed: [] }).eq("id", match.id);
}

/** Dismisses the product tour if it auto-opened (it fires ~900ms after
 * login), so a test can interact with the underlying page without the
 * coach-mark overlay intercepting clicks. */
export async function dismissTourIfOpen(page: Page) {
  const skip = page.getByRole("button", { name: "Skip" });
  try {
    await skip.waitFor({ state: "visible", timeout: 8000 });
    await skip.click();
    await skip.waitFor({ state: "hidden", timeout: 5000 });
  } catch {
    // Tour never appeared (already dismissed for this user) — nothing to do.
  }
}
