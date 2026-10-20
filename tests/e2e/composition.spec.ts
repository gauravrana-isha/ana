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

test.describe("Profile", () => {
  test("with Reflection alone: its figures and its setting, nothing of the others", async ({ page }) => {
    await setBundles(page, ["reflection"]);
    await page.goto("/profile");
    const month = page.locator("section", { hasText: "This month" });
    await expect(month.getByText("Daily", { exact: true })).toBeVisible();
    await expect(month.getByText("Weekly", { exact: true })).toBeVisible();
    await expect(month.getByText("Moments", { exact: true })).toHaveCount(0);
    await expect(month.getByText("Practice days", { exact: true })).toHaveCount(0);
    await expect(page.getByRole("link", { name: /Reflection questions/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Practices/ })).toHaveCount(0);
    // Another bundle's setting page isn't theirs: Profile itself.
    await page.goto("/profile/practices");
    await expect(page.getByRole("heading", { name: "Practices", exact: true })).toHaveCount(0);
    await expect(page.getByText("This month")).toBeVisible();
  });

  test("with every bundle: every figure and setting; no Tab bar choice with four or fewer bundles", async ({ page }) => {
    await page.goto("/profile");
    const month = page.locator("section", { hasText: "This month" });
    for (const label of ["Daily", "Weekly", "Moments", "Practice days"]) await expect(month.getByText(label, { exact: true })).toBeVisible();
    await expect(page.getByRole("link", { name: /^Practices/ })).toBeVisible();
    await expect(page.getByRole("link", { name: /Reflection questions/ })).toBeVisible();
    await expect(page.getByRole("button", { name: /^Tab bar/ })).toHaveCount(0);
    await page.getByRole("link", { name: /^Practices/ }).click();
    await expect(page.getByRole("heading", { name: "Practices", exact: true })).toBeVisible();
  });
});

test.describe("Insights", () => {
  test("a section for each bundle, under its name", async ({ page }) => {
    await page.goto("/insights");
    for (const name of ["Sadhana", "Reflection", "Presence"]) await expect(page.getByRole("heading", { name, level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Practice and mood together" })).toBeVisible();
  });

  test("with Reflection alone: only its section", async ({ page }) => {
    await setBundles(page, ["reflection"]);
    await page.goto("/insights");
    await expect(page.getByRole("heading", { name: "Reflection", level: 2 })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Mood, the last eight weeks" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Sadhana", level: 2 })).toHaveCount(0);
    await expect(page.getByRole("heading", { name: "Presence", level: 2 })).toHaveCount(0);
    // Practice-and-mood needs both bundles.
    await expect(page.getByRole("heading", { name: "Practice and mood together" })).toHaveCount(0);
  });
});

test("a stray 'not signed in' reply for your details never breaks Home (it showed the error screen)", async ({ page }) => {
  await page.route("**/api/me", (route) => route.fulfill({ status: 401, contentType: "application/json", body: JSON.stringify({ signedIn: false }) }));
  await page.goto("/home");
  await expect(page.getByRole("button", { name: /Search your logger/ })).toBeVisible();
  await page.getByRole("button", { name: /Search your logger/ }).click();
  await expect(page.getByText("Something went wrong")).toHaveCount(0);
  await page.unroute("**/api/me");
});
