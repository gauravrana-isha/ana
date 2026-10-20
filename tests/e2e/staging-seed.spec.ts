/* The staging seed script (scripts/seed-staging.ts) fills a journal the app can read, sealed with its key. */
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import { test, expect, PHRASE_FILE } from "./fixtures";

test("the staging seed script fills a journal the app can read", async ({ page }) => {
  test.setTimeout(180_000);
  const out = execSync("npx tsx scripts/seed-staging.ts --email e2e@example.com --force", {
    env: { ...process.env, SEED_DATABASE_URL: process.env.TEST_DATABASE_URL },
    input: readFileSync(PHRASE_FILE, "utf8"),
  }).toString();
  console.log(out.trim().split("\n").pop());
  await page.waitForTimeout(31_000); // the device's copy is no longer fresh, as on a later visit
  await page.goto("/presence");
  await expect(page.getByRole("region", { name: "Food" }).getByText("Amma's rasam").first()).toBeVisible({ timeout: 20_000 });
  await expect(page.getByRole("region", { name: "People" }).getByText("Ravi")).toBeVisible();
  await page.goto("/home");
  await expect(page.getByText("Birthdays this week")).toBeVisible({ timeout: 20_000 });
  await expect(page.getByText("On this day")).toBeVisible();
  await page.goto("/moments");
  await expect(page.getByText("Sunrise at the lake").first()).toBeVisible();
  await page.goto("/insights");
  await expect(page.getByRole("heading", { name: "Mood, the last eight weeks" })).toBeVisible();
  await page.goto("/sankalpa");
  await expect(page.getByText(/sadhana to be the first thing/)).toBeVisible();
  await page.goto("/admin");
  await page.getByRole("radio", { name: /^All/ }).click();
  await expect(page.getByText("Lakshmi Iyer")).toBeVisible();
});
