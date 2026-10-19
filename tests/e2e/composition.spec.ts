import { test, expect, setBundles } from "./fixtures";

/* Home, Profile and Insights show only what the person's bundles bring. */

test.afterEach(async ({ page }) => setBundles(page, ["sadhana", "reflection", "expressions"]));

const heading = (page: import("@playwright/test").Page, name: string) => page.getByRole("heading", { name, exact: true });

test.describe("Home", () => {
  test("with every bundle: each one's cards", async ({ page }) => {
    await page.goto("/home");
    await expect(heading(page, "Keep a moment")).toBeVisible();
    await expect(heading(page, "Today's practices")).toBeVisible();
    await expect(page.getByRole("link", { name: /Daily reflection/ })).toBeVisible();
  });

  test("with Reflection alone: only its cards", async ({ page }) => {
    await setBundles(page, ["reflection"]);
    await page.goto("/home");
    await expect(page.getByRole("link", { name: /Daily reflection/ })).toBeVisible();
    await expect(heading(page, "Keep a moment")).toHaveCount(0);
    await expect(heading(page, "Today's practices")).toHaveCount(0);
  });

  test("with Sadhana alone: only its cards", async ({ page }) => {
    await setBundles(page, ["sadhana"]);
    await page.goto("/home");
    await expect(heading(page, "Today's practices")).toBeVisible();
    await expect(page.getByRole("link", { name: /Daily reflection/ })).toHaveCount(0);
    await expect(heading(page, "Keep a moment")).toHaveCount(0);
  });
});
