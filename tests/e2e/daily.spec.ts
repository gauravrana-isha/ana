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
  for (let i = 0; i < 7; i++) await page.getByRole("button", { name: /^(Next|Skip)/ }).click();
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
