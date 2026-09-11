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
  await page.getByRole("button", { name: "Customer login" }).click();
  await page.getByLabel("Email").fill(DEMO.customer.email);
  await page.getByLabel("Password").fill(DEMO.customer.password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
}

export async function loginAsStaff(page: Page, who: "vendor" | "operations" | "admin") {
  await page.goto("/");
  await page.evaluate(() => localStorage.clear());
  await page.goto("/");
  await page.getByRole("button", { name: "Vendor / Team" }).click();
  await page.getByLabel("Email").fill(DEMO[who].email);
  await page.getByLabel("Password").fill(DEMO[who].password);
  await page.locator("form").getByRole("button", { name: "Sign in" }).click();
  await page.waitForSelector('text=Loading your ShePlates profile', { state: "hidden", timeout: 15_000 }).catch(() => {});
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
