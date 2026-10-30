import { PrismaClient } from "@prisma/client";
import { test, expect, USER_ID } from "./fixtures";

const started = new Date();

/* Practices are added, edited and removed from the Sadhana page itself, as from Profile. */

test("Edit practices on the Sadhana page: the list, editing one, adding from the library", async ({ page }) => {
  await page.goto("/sadhana");
  await expect(page.getByText("No practices yet.").or(page.getByRole("button", { name: "Edit practices" }))).toBeVisible();
  // With none yet, add one first.
  if (await page.getByText("No practices yet.").isVisible()) {
    await page.getByRole("button", { name: /Add practices/ }).click();
    await page.getByText("Library", { exact: true }).click();
    await page.getByRole("button", { name: "Add Isha Kriya" }).click();
    await expect(page.getByRole("button", { name: "Remove Isha Kriya" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
  }

  await page.getByRole("button", { name: "Edit practices" }).click();
  const sheet = page.getByRole("dialog", { name: "Your practices" });
  await expect(sheet).toBeVisible();
  const first = sheet.getByRole("button", { name: /^Edit / }).first();
  const name = (await first.getAttribute("aria-label"))!.replace(/^Edit /, "");
  await first.click();
  // The practice's own editor opens over the list.
  await expect(page.getByRole("dialog").filter({ hasText: name }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  // And the library, to add or change practices.
  await sheet.getByRole("button", { name: /Add or change practices/ }).click();
  await expect(page.getByText("Library", { exact: true })).toBeVisible();
});

test("your own practices: up to 2× or 3× a day, levels with their own names, in one list with the rest", async ({ page }) => {
  const add = async (name: string, track: string, setUp: () => Promise<void>) => {
    await page.goto("/sadhana");
    await page.getByRole("button", { name: /Edit practices|Add practices/ }).click();
    const sheet = page.getByRole("dialog").last();
    const create = sheet.getByText("Create", { exact: true });
    if (!(await create.isVisible())) await sheet.getByRole("button", { name: /Add or change practices/ }).click();
    await page.getByText("Create", { exact: true }).click();
    await page.getByPlaceholder(/Pradakshina/).fill(name);
    await page.getByRole("button", { name: new RegExp(track) }).click();
    await setUp();
    await page.getByRole("button", { name: "Add practice" }).click();
    await expect(page.getByText(`${name} added`)).toBeVisible();
  };

  await add("Cold shower", "Times a day", async () => {
    await page.getByRole("radiogroup", { name: "Times a day, up to" }).getByRole("radio", { name: "2×" }).click();
  });
  await add("Silence", "3-level scale", async () => {
    await page.getByLabel("Level 1").fill("Few words");
    await page.getByLabel("Level 2").fill("Some");
    await page.getByLabel("Level 3").fill("Many");
  });

  await page.goto("/sadhana");
  // One list: no separate heading for your own practices.
  await expect(page.getByRole("heading", { name: "My own practices" })).toHaveCount(0);
  const shower = page.getByRole("radiogroup", { name: "Cold shower: Times" });
  await expect(shower.getByRole("radio")).toHaveText(["1×", "2×"]);
  await expect(page.getByRole("radiogroup", { name: "Silence: Value" }).getByRole("radio", { name: "Few words" })).toBeVisible();
  await expect(page.getByRole("radiogroup", { name: "Silence: Value" }).getByRole("radio", { name: "Many" })).toBeVisible();

  // Renamed later from the practice's own editor.
  await page.getByRole("button", { name: "Edit practices" }).click();
  await page.getByRole("dialog").last().getByRole("button", { name: "Edit Silence" }).click();
  await page.getByLabel("Level 3").fill("A lot");
  await page.getByRole("button", { name: "Save" }).click();
  await expect(page.getByText("Silence updated")).toBeVisible();
  await page.goto("/sadhana");
  await expect(page.getByRole("radiogroup", { name: "Silence: Value" }).getByRole("radio", { name: "A lot" })).toBeVisible();
});

// The two practices above are removed afterwards (names are sealed, so by when they were made).
test.afterAll(async () => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await db.practice.deleteMany({ where: { userId: USER_ID, tier: "CUSTOM", createdAt: { gt: started } } });
  await db.$disconnect();
});
