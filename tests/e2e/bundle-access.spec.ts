import { test, expect, setBundles, USER_ID } from "./fixtures";

/* Bundles are the admin's to give: the screens, Profile and the API follow what was given. */

test.afterEach(async ({ page }) => setBundles(page, ["sadhana", "reflection", "expressions"]));

test("a member with only Reflection has its screens and settings, and nothing else", async ({ page }) => {
  await setBundles(page, ["reflection"]);
  const me = await (await page.request.get("/api/me")).json();
  expect(me.bundles).toEqual(["reflection"]);
  expect(me.features).toEqual(["today", "daily", "weekly", "commitment", "insights"]);

  // Another bundle's screen sends them home.
  await page.goto("/sadhana");
  await expect(page).toHaveURL(/\/home/);
  // Profile shows Reflection's own setting, not Sadhana's; there's no section picker.
  await page.goto("/profile");
  await expect(page.getByRole("link", { name: /Reflection questions/ })).toBeVisible();
  await expect(page.getByRole("link", { name: /^Practices/ })).toHaveCount(0);
  await expect(page.getByRole("link", { name: /^Sections/ })).toHaveCount(0);
});

test("everyone keeps at least one bundle", async ({ page }) => {
  const res = await page.request.patch(`/api/admin/users/${USER_ID}`, { data: { bundles: { sadhana: false, reflection: false, expressions: false } } });
  expect(res.status()).toBe(400);

  await setBundles(page, ["expressions"]);
  await page.goto("/admin");
  await page.getByRole("radio", { name: /^All/ }).click();
  await page.getByRole("button", { name: "Show details" }).first().click();
  await page.getByRole("button", { name: /^Expressions .*given/ }).click();
  await expect(page.getByText("Everyone needs at least one bundle.")).toBeVisible();
  // Giving another works.
  await page.getByRole("button", { name: /^Sadhana .*not given/ }).click();
  await expect(page.getByRole("button", { name: /^Sadhana .*: given/ })).toBeVisible();
});

test("members can't give themselves bundles", async ({ page }) => {
  await setBundles(page, ["reflection"]);
  await page.request.patch("/api/me", { data: { features: { tracker: true } } });
  const me = await (await page.request.get("/api/me")).json();
  expect(me.bundles).toEqual(["reflection"]);
});
