import { test, expect } from "@playwright/test";
import { loginAsCustomer, switchTo, dismissTourIfOpen, openStaffNavIfCollapsed } from "./helpers";

// A distinctive title avoids colliding with any other RFQ left in local
// mock state (state.requirements — see helpers.ts switchTo doc comment).
const RFQ_TITLE = `E2E monthly groceries ${Date.now()}`;

test.describe("Monthly requirement (RFQ) and quotations", () => {
  test("customer publishes an RFQ, it appears under My quotations, and granting a vendor Premium persists and unlocks their quote access", async ({ page }) => {
    await loginAsCustomer(page);
    await dismissTourIfOpen(page);

    // Publish an RFQ as the customer.
    const accountTrigger = page.locator('[data-tour="account"]:visible, [data-tour="account-mobile"]:visible').first();
    await accountTrigger.click();
    await page.getByRole("button", { name: "Monthly requirement" }).click();
    await page.getByLabel("Request title").fill(RFQ_TITLE);
    await page.getByLabel("Item 1").fill("Sunflower oil");
    await page.getByRole("button", { name: "Publish RFQ" }).click();
    await expect(page.getByText("RFQ sent to eligible local vendors")).toBeVisible();

    // It shows up under My quotations with a "Quoting" status.
    await accountTrigger.click();
    await page.getByRole("button", { name: "My quotations" }).click();
    const requirementCard = page.locator(".surface-card", { hasText: RFQ_TITLE });
    await expect(requirementCard).toBeVisible();
    await expect(requirementCard.getByText("Quoting", { exact: true })).toBeVisible();
    await expect(requirementCard.getByText("Invited vendors", { exact: true })).toBeVisible();

    // Regression guard: Super Admin's "Vendor plans" page used to only ever
    // mutate local React state — it looked like it worked, but never wrote to
    // Supabase, so every vendor session always reloaded as "Launch" no matter
    // what Super Admin picked, and no vendor could ever see RFQ opportunities
    // in production. Confirm the assignment now actually persists.
    await switchTo(page, "admin");
    await openStaffNavIfCollapsed(page);
    await page.getByRole("button", { name: "Vendors" }).click();
    const murugan = page.locator("tr", { hasText: "Murugan Daily Foods" });
    // Force a real Launch -> Premium transition regardless of whatever plan
    // is currently set (Radix's onValueChange is a no-op when re-selecting
    // the already-active option, so it wouldn't otherwise fire reliably).
    await murugan.getByRole("combobox").click();
    await page.getByRole("option", { name: "Launch" }).click();
    await murugan.getByRole("combobox").click();
    await page.getByRole("option", { name: "Premium" }).click();
    await expect(page.getByText("Murugan Daily Foods moved to Premium")).toBeVisible();

    await page.reload();
    await openStaffNavIfCollapsed(page);
    await page.getByRole("button", { name: "Vendors" }).click();
    await expect(page.locator("tr", { hasText: "Murugan Daily Foods" }).getByRole("combobox")).toContainText("Premium");

    // The vendor's own dashboard reflects the real, persisted plan.
    await switchTo(page, "vendor");
    await dismissTourIfOpen(page);
    await openStaffNavIfCollapsed(page);
    await page.getByRole("button", { name: "Quote opportunities" }).click();
    await expect(page.getByRole("heading", { name: "Local RFQ opportunities" })).toBeVisible();
    await expect(page.getByText("Quotation access is on Premium")).not.toBeVisible();
  });
});
