import { PrismaClient } from "@prisma/client";
import { test, expect, USER_ID, clearReflections } from "./fixtures";

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

test("swiping a card with a finger, from the question or the writing area, moves it; the tab bar never flashes", async ({ page }) => {
  await clearReflections();
  await page.waitForTimeout(31_000); // the device's copy of the day is no longer fresh
  await page.goto("/daily");
  const card = page.locator("[aria-roledescription=card]").first();
  await card.waitFor();
  // Count every change to whether the tab bar is hidden (it hides only while the keyboard is up).
  await page.evaluate(() => {
    const w = window as unknown as { flips: number };
    w.flips = 0;
    let was = document.documentElement.classList.contains("kb-open");
    new MutationObserver(() => {
      const now = document.documentElement.classList.contains("kb-open");
      if (now !== was) w.flips++;
      was = now;
    }).observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
  });
  const cdp = await page.context().newCDPSession(page);
  const swipeLeft = async (y: number, from: number, to: number) => {
    const at = (type: "touchStart" | "touchMove" | "touchEnd", x: number) => cdp.send("Input.dispatchTouchEvent", { type, touchPoints: type === "touchEnd" ? [] : [{ x, y }] });
    await at("touchStart", from);
    for (let x = from - 20; x > to; x -= 25) {
      await at("touchMove", x);
      await page.waitForTimeout(16);
    }
    await at("touchEnd", 0);
    await page.waitForTimeout(700);
  };
  const box = (await card.boundingBox())!;
  await swipeLeft(box.y + 70, box.x + box.width - 30, box.x + 20);
  await expect(page.getByText("2 / 7")).toBeVisible();

  // From the writing area, after typing in it (the keyboard would be up).
  const ta = page.locator("[aria-roledescription=card] textarea").first();
  await ta.click();
  await ta.pressSequentially("Steady");
  const tb = (await ta.boundingBox())!;
  await swipeLeft(tb.y + 20, tb.x + tb.width - 10, tb.x + 10);
  await expect(page.getByText("3 / 7")).toBeVisible();
  // Typing hid it once and the swipe let it back once: never out-in-out.
  expect(await page.evaluate(() => (window as unknown as { flips: number }).flips)).toBeLessThanOrEqual(2);
  await expect(page.locator("html")).not.toHaveClass(/kb-open/);
});
