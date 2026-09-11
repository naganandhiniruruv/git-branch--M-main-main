import type { Page } from "@playwright/test";

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

/** Opens the staff sidebar drawer if it's currently a closed hamburger menu
 * (narrow viewports only — on desktop the sidebar is always visible and this
 * button is a harmless no-op toggle). */
export async function openStaffNavIfCollapsed(page: Page) {
  const toggle = page.getByRole("button", { name: "Toggle navigation" });
  if (await toggle.isVisible().catch(() => false)) {
    await toggle.click();
  }
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
