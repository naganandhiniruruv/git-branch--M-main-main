import { test, expect, type Page } from "@playwright/test";
import { buildDemoState, DEMO_CUSTOMER } from "./fixtures/demo-state";

// Runs against the demo-mode server (playwright.demo.config.ts): no database,
// all data comes from fixtures/demo-state.ts, so these specs cover the
// redesigned customer portal even when Supabase is unreachable.

async function openAsCustomer(page: Page, extra?: { socialPosts?: unknown[] }) {
  const state = buildDemoState();
  const session = { email: DEMO_CUSTOMER.email, name: DEMO_CUSTOMER.name, role: "customer", toursCompleted: ["customer_v1"] };
  await page.addInitScript(([s, u, posts]) => {
    if (!sessionStorage.getItem("seeded")) {
      localStorage.clear();
      localStorage.setItem("sheplates-v3-state", JSON.stringify(s));
      localStorage.setItem("sheplates-v3-session", JSON.stringify(u));
      if (posts) localStorage.setItem("sheplates-social-posts-v1", JSON.stringify({ posts, comments: {}, likeBonus: {} }));
      sessionStorage.setItem("seeded", "1");
    }
  }, [state, session, extra?.socialPosts ?? null] as const);
  await page.goto("/");
  await expect(page.getByRole("button", { name: "Stories", exact: true })).toBeVisible({ timeout: 15_000 });
}
const tab = (page: Page, name: string) => page.getByRole("button", { name, exact: true });

test.describe("Customer portal — redesigned shell (demo data)", () => {
  test("crimson theme applies only to signed-in customers, with the six primary tabs", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/theme-customer/);

    await openAsCustomer(page);
    await expect(page.locator("html")).toHaveClass(/theme-customer/);
    for (const name of ["Maps", "Marketplace", "Schedules", "Food Drops", "Stories", "Profile"]) await expect(tab(page, name)).toBeVisible();
  });

  test("Marketplace: ten category tiles filter products, and vendor rows open the public vendor profile", async ({ page }) => {
    await openAsCustomer(page);
    const tiles = page.locator('[data-tour="categories"] button');
    await expect(tiles).toHaveCount(10);

    await page.getByRole("button", { name: "Meat & Seafood", exact: true }).click();
    const grid = page.locator('[data-tour="products"]');
    await expect(grid.getByRole("heading", { name: "Chicken Curry Cut" })).toBeVisible();
    await expect(grid.getByRole("heading", { name: "Mini Meals" })).toHaveCount(0);
    await page.getByRole("button", { name: "Meat & Seafood", exact: true }).click(); // toggles back to all

    await page.getByRole("button", { name: "Open Meena's Home Kitchen" }).first().click();
    const dialog = page.getByRole("dialog");
    await expect(dialog.getByRole("heading", { name: "Meena's Home Kitchen" })).toBeVisible();
    await expect(dialog.getByText("FSSAI Verified")).toBeVisible();
    await dialog.getByRole("tab", { name: "Food Drops" }).click();
    await expect(dialog.getByText(/Chicken Biryani/)).toBeVisible();
  });

  test("Vendor menu: wishlist heart saves the product to the Wishlist page", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Marketplace").click();
    await page.getByRole("button", { name: "Open Meena's Home Kitchen" }).first().click();

    const dialog = page.getByRole("dialog");
    const productName = (await dialog.locator(".text-sm.font-black.leading-snug").first().textContent())?.trim();
    const saveButton = dialog.getByRole("button", { name: "Save to wishlist" }).first();
    await expect(saveButton).toBeVisible();
    await saveButton.click();
    await expect(dialog.getByRole("button", { name: "Remove from wishlist" }).first()).toHaveAttribute("aria-pressed", "true");

    await page.keyboard.press("Escape");
    await tab(page, "Profile").click();
    await page.getByRole("button", { name: "Wishlist", exact: true }).click();
    await expect(page.getByRole("heading", { name: "Your wishlist" })).toBeVisible();
    await expect(page.getByRole("heading", { name: productName! })).toBeVisible();
  });

  test("Food Drops: live cards with countdowns; Following scope fills once a vendor is followed", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Food Drops").click();
    await expect(page.getByRole("button", { name: "Add +" })).toHaveCount(4);
    await expect(page.getByText("Slightly blemished").first()).toBeVisible();
    await expect(page.getByText(/Closes in/i).first()).toBeVisible();

    await page.getByRole("tab", { name: "Following" }).click();
    await expect(page.getByText("No drops from vendors you follow")).toBeVisible();

    await tab(page, "Marketplace").click();
    await page.getByRole("button", { name: "Open ABC Bakery" }).first().click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("button", { name: "Follow", exact: true }).click();
    await expect(dialog.getByRole("button", { name: "Following", exact: true })).toBeVisible();
    await page.keyboard.press("Escape");

    await tab(page, "Food Drops").click();
    await page.getByRole("tab", { name: "Following" }).click();
    await expect(page.getByRole("heading", { name: "Fresh Croissants (Surplus)" })).toBeVisible();
    await expect(page.getByRole("button", { name: "Add +" })).toHaveCount(1);
  });

  test("Schedules: Orders and Subscriptions live under one tab", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Schedules").click();
    await expect(page.getByRole("heading", { name: "My Schedules" })).toBeVisible();
    await expect(page.getByText("Orders & live tracking")).toBeVisible();
    await page.getByRole("tab", { name: "Subscriptions" }).click();
    await expect(page.getByText("Mini Meals").first()).toBeVisible();
  });

  test("Stories: statuses rail on top, Food Shorts below with Nearby and Following, no posts feed", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Stories").click();
    await expect(page.getByRole("heading", { name: "Stories", exact: true })).toBeVisible();
    await expect(page.getByTestId("status-rail")).toBeVisible();
    await expect(page.getByRole("heading", { name: "Food Shorts", exact: true })).toBeVisible();
    for (const name of ["Nearby", "Following"]) await expect(page.getByRole("tab", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "Post", exact: true })).toHaveCount(0);
    await expect(page.locator("article")).toHaveCount(0);
  });

  test("Profile: public profile with stats and tabs, plus the account hub links", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Profile").click();
    await expect(page.getByRole("heading", { name: "Raj" })).toBeVisible();
    // the profile is slim: no upload gallery any more
    for (const name of ["Photos", "Food Trials", "Saved"]) await expect(page.getByRole("tab", { name })).toHaveCount(0);
    await expect(page.getByTestId("profile-stats")).toBeVisible();
    await expect(page.getByRole("switch", { name: "Show me on the map" })).toHaveAttribute("aria-checked", "false");
    for (const name of ["Profile & food", "Wishlist", "Orders", "My schedule", "Monthly requirement", "My quotations", "Ticket centre", "Sign out"]) await expect(page.getByRole("button", { name, exact: true })).toBeVisible();
    await expect(page.getByRole("button", { name: "My food trail", exact: true })).toHaveCount(0);

    await page.getByRole("button", { name: "Edit Profile" }).click();
    await page.getByLabel("Handle").fill("raj_eats");
    await page.getByLabel("Bio").fill("Weekend biryani hunter");
    await page.getByRole("button", { name: "Save changes" }).click();
    await expect(page.getByText("@raj_eats")).toBeVisible();
    await expect(page.getByText("Weekend biryani hunter")).toBeVisible();
  });

  test("Maps: vendor pins, scope tabs and the list toggle", async ({ page }) => {
    await openAsCustomer(page);
    await tab(page, "Maps").click();
    await expect(page.locator(".sp-vendor-map")).toBeVisible({ timeout: 15_000 });
    await expect(page.locator(".sp-map-photo-pin").first()).toBeVisible();
    await page.getByRole("tab", { name: "Following" }).click();
    await expect(page.getByText("You're not following any vendors yet")).toBeVisible();
    await page.getByRole("tab", { name: "Nearby" }).click();
    await page.getByRole("button", { name: /^List \(\d+\)$/ }).click();
    await expect(page.getByRole("button", { name: "View", exact: true }).first()).toBeVisible();
  });
});
