import { test, expect } from "@playwright/test";
import { loginAsCustomer, dismissTourIfOpen } from "./helpers";

test.describe("Interactive nearby-vendors map", () => {
  test("opens from the marketplace toolbar and the radius stepper updates the in-range count", async ({ page }) => {
    await loginAsCustomer(page);
    await dismissTourIfOpen(page);

    await page.getByRole("button", { name: "Map" }).click();
    await expect(page.locator(".sp-vendor-map")).toBeVisible({ timeout: 10_000 });
    await expect(page.getByText(/Showing within \d+ km on the map/)).toBeVisible();

    const increase = page.getByRole("button", { name: "Increase radius" });
    await expect(increase).toBeVisible();
    await increase.click();
    await expect(page.getByText("Showing within 11 km on the map")).toBeVisible();

    const decrease = page.getByRole("button", { name: "Decrease radius" });
    await decrease.click();
    await expect(page.getByText("Showing within 10 km on the map")).toBeVisible();

    // The customer's own position must always render, regardless of whether
    // any vendor has a saved coordinate yet (that needs the V7_6 migration).
    await expect(page.locator(".sp-map-you")).toBeVisible();
  });

  test("clicking a vendor pin's 'View products' closes the map and reveals that vendor's filtered products", async ({ page }) => {
    await loginAsCustomer(page);
    await dismissTourIfOpen(page);

    await page.getByRole("button", { name: "Map" }).click();
    const map = page.locator(".sp-vendor-map");
    await expect(map).toBeVisible({ timeout: 10_000 });

    // Regression guard: the marker's own click and the popup's "View products"
    // button used to share one toggle handler, so opening the popup (which
    // fires a marker click) then confirming "View products" toggled the
    // filter straight back off, and even a successful filter left the map
    // covering the results with no indication anything had happened.
    const vendorMarker = map.locator(".sp-map-vendor").first();
    await expect(vendorMarker).toBeVisible({ timeout: 10_000 });
    await vendorMarker.click();
    await page.getByRole("button", { name: "View products" }).click();

    await expect(map).not.toBeVisible();
    const filterChip = page.getByText(/^Viewing /);
    await expect(filterChip).toBeVisible();
    const grid = page.locator('[data-tour="products"]');
    await expect(grid).toBeVisible();
    await expect(grid.locator("article").first()).toBeVisible();
  });
});
