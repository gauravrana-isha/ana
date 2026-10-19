import { PrismaClient } from "@prisma/client";
import { test, expect, USER_ID } from "./fixtures";

/* Daily: a day not yet answered opens the question cards, even if this device remembered answers. */

test.setTimeout(120_000);

test("when the day's answers are gone from the journal, the cards open again (not a blank page)", async ({ page }) => {
  await page.goto("/daily");
  const card = page.locator("[aria-roledescription=card]").first();
  await card.waitFor();
  await card.locator("textarea").fill("Twice today.");
  // Through to the end, then Save.
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Twice today.")).toBeVisible();

  // Removed in the journal (say, from another device): the device still remembers the answers.
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await db.dailyReflection.deleteMany({ where: { userId: USER_ID } });
  await db.$disconnect();

  // Coming back later (the device's copy is no longer fresh, so the journal's is fetched).
  await page.waitForTimeout(31_000);
  await page.reload();
  await expect(page.locator("[aria-roledescription=card]").first()).toBeVisible({ timeout: 20_000 });
});

test("Weekly: a week not answered yet is asked one question at a time, then read back", async ({ page }) => {
  await page.goto("/weekly");
  const card = page.locator("[aria-roledescription=card]").first();
  await card.waitFor();
  await expect(page.getByText(/^1 \/ \d+$/)).toBeVisible();
  await card.locator("textarea").fill("Sitting longer, more still.");
  const steps = Number((await page.getByText(/^1 \/ \d+$/).innerText()).split("/")[1]);
  for (let i = 1; i < steps; i++) await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Sitting longer, more still.")).toBeVisible();
  await expect(page.locator("[aria-roledescription=card]")).toHaveCount(0);

  // Cleared and saved: the cards again.
  await page.getByRole("button", { name: "Edit reflection" }).click();
  await page.getByRole("textbox").first().fill("");
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(page.locator("[aria-roledescription=card]").first()).toBeVisible({ timeout: 15_000 });
});

test("clearing a saved day (words and mood) and saving brings the cards back", async ({ page }) => {
  await page.goto("/daily");
  const card = page.locator("[aria-roledescription=card]").first();
  await card.waitFor();
  await card.locator("textarea").fill("Once, before sleep.");
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  // The mood: chosen, then tapped again to clear it, then chosen again.
  await page.getByRole("radio", { name: "Content" }).click();
  await expect(page.getByRole("radio", { name: "Content" })).toHaveAttribute("aria-checked", "true");
  await page.getByRole("radio", { name: "Content" }).click();
  await expect(page.getByRole("radio", { name: "Content" })).toHaveAttribute("aria-checked", "false");
  await page.getByRole("radio", { name: "Content" }).click();
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Once, before sleep.")).toBeVisible();

  // Change it: clear the words and the mood, save with the floating ✓.
  await page.getByRole("button", { name: "Edit reflection" }).click();
  await page.getByRole("textbox").first().fill("");
  await page.getByRole("radio", { name: "Content" }).click();
  await page.getByRole("button", { name: "Save reflection" }).click();
  await expect(page.locator("[aria-roledescription=card]").first()).toBeVisible({ timeout: 15_000 });
});
