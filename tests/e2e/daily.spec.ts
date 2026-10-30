import path from "node:path";
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

test("the tab bar steps aside only for a real keyboard (focus alone doesn't move it)", async ({ page }) => {
  await clearReflections();
  await page.waitForTimeout(31_000); // the device's copy of the day is no longer fresh
  await page.goto("/daily");
  const ta = page.locator("[aria-roledescription=card] textarea").first();
  await ta.waitFor();
  const size = page.viewportSize()!;
  // Focus without the keyboard (as when focus moves on its own): the bar stays.
  await ta.focus();
  await page.waitForTimeout(400);
  await expect(page.locator("html")).not.toHaveClass(/kb-open/);
  // The keyboard opens (the screen shrinks): the bar steps aside.
  await page.setViewportSize({ width: size.width, height: size.height - 320 });
  await expect(page.locator("html")).toHaveClass(/kb-open/);
  // Next card: the box lets go, the keyboard closes, the bar is back.
  await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  await page.setViewportSize(size);
  await expect(page.locator("html")).not.toHaveClass(/kb-open/);
});

test("a card changing never makes the page wider than the screen (Android re-laid out the tab bar)", async ({ page }) => {
  await clearReflections();
  await page.waitForTimeout(31_000); // the device's copy of the day is no longer fresh
  await page.goto("/daily");
  await page.locator("[aria-roledescription=card]").first().waitFor();
  await page.evaluate(() => {
    const w = window as unknown as { widest: number };
    w.widest = 0;
    const tick = () => {
      w.widest = Math.max(w.widest, document.documentElement.scrollWidth - document.documentElement.clientWidth);
      requestAnimationFrame(tick);
    };
    tick();
  });
  await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  await page.waitForTimeout(800);
  await page.getByRole("button", { name: "Previous question" }).click();
  await page.waitForTimeout(800);
  expect(await page.evaluate(() => (window as unknown as { widest: number }).widest)).toBe(0);
});

test("every Daily and Weekly question and the mood have a quiet picture, credited on its own page", async ({ page }) => {
  await clearReflections();
  await page.goto("/daily");
  const card = page.locator("[aria-roledescription=card]").first();
  await card.waitFor();
  await expect(page.getByRole("img", { name: "People sitting quietly by the sea at dawn" })).toBeVisible();
  await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  const meal = page.getByRole("img", { name: "A meal served on a banana leaf" });
  await expect(meal).toBeVisible();
  await expect.poll(() => meal.evaluate((img: HTMLImageElement) => img.naturalWidth)).toBeGreaterThan(0);
  // No names on the pictures themselves.
  await expect(page.getByRole("link", { name: /CC BY/ })).toHaveCount(0);
  if (process.env.SHOTS) {
    await page.waitForTimeout(900);
    await page.screenshot({ path: `${process.env.SHOTS}/q-phone.png` });
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.screenshot({ path: `${process.env.SHOTS}/q-desk.png` });
  }

  // The mood: five photos side by side, then the chosen one opens out to fill the space.
  for (let i = 0; i < 6; i++) await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
  const strip = page.locator("[aria-roledescription=card] img");
  await expect(strip).toHaveCount(5);
  if (process.env.SHOTS) {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${process.env.SHOTS}/q-mood-none.png` });
  }
  await page.getByRole("radio", { name: "Content" }).click();
  await expect.poll(async () => (await strip.nth(3).boundingBox())?.width ?? 0).toBeGreaterThan(((await strip.nth(3).evaluate((el) => el.parentElement!.clientWidth)) as number) * 0.9);
  if (process.env.SHOTS) {
    await page.waitForTimeout(700);
    await page.screenshot({ path: `${process.env.SHOTS}/q-mood.png` });
  }

  // Each step of the Weekly reflection shows its picture, loaded.
  await page.goto("/weekly");
  await page.locator("[aria-roledescription=card]").first().waitFor();
  const steps = Number((await page.getByText(/^1 \/ \d+$/).innerText()).split("/")[1]);
  for (let i = 0; i < steps; i++) {
    const img = page.locator("[aria-roledescription=card] figure img").first();
    await expect.poll(() => img.evaluate((el: HTMLImageElement) => el.naturalWidth), { message: `weekly step ${i + 1}` }).toBeGreaterThan(0);
    if (process.env.SHOTS && i === 6) {
      await page.waitForTimeout(900);
      await page.screenshot({ path: `${process.env.SHOTS}/q-weekly.png` });
    }
    if (i < steps - 1) {
      await page.getByRole("button", { name: /^(Next|Skip)$/ }).click();
      await page.waitForTimeout(400);
    }
  }
});

test("the picture credits page names who took each photo", async ({ page }) => {
  await page.goto("/credits");
  await expect(page.getByRole("heading", { name: "Picture credits" })).toBeVisible();
  await expect(page.getByRole("link", { name: "Codegeass123" })).toHaveAttribute("href", /commons\.wikimedia\.org/);
  await expect(page.getByText("Mood: Blissful")).toBeVisible();
});

test("a question's picture can be your own: chosen in Settings, framed 3 by 1, and put back to the original", async ({ page }) => {
  await clearReflections();
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  try {
    await page.goto("/profile/questions");
    const edit = () => page.getByRole("button", { name: /^Edit: How many times a day am I doing the Inner Engineering Crash Course/ }).click();
    await edit();
    // The built-in's own picture, until it's changed.
    await expect(page.getByRole("dialog").getByRole("img", { name: "People sitting quietly by the sea at dawn" })).toBeVisible();
    await page.getByLabel("Choose a picture").setInputFiles(path.join(__dirname, "../../public/images/questions/eating.webp"));
    // Framed the way it will show: three wide to one high.
    const frame = page.getByRole("dialog", { name: "Move and scale" }).locator("div[style*='aspect-ratio']");
    await expect.poll(async () => { const b = await frame.boundingBox(); return b ? Math.round((b.width / b.height) * 10) / 10 : 0; }).toBe(3);
    if (process.env.SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOTS}/qp-crop.png` }); }
    await page.getByRole("button", { name: "Use photo" }).click();
    await expect(page.getByRole("dialog").getByRole("img", { name: "People sitting quietly by the sea at dawn" })).toHaveCount(0);
    if (process.env.SHOTS) { await page.waitForTimeout(500); await page.screenshot({ path: `${process.env.SHOTS}/qp-sheet.png` }); }
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Question saved")).toBeVisible();

    // On Daily, the chosen photo (opened from its encrypted copy) above the question.
    await page.goto("/daily");
    const picture = page.locator("[aria-roledescription=card]").first().locator("figure img");
    await expect.poll(() => picture.evaluate((img: HTMLImageElement) => (img.src.startsWith("blob:") ? img.naturalWidth : 0))).toBeGreaterThan(0);
    const box = (await picture.boundingBox())!;
    expect(Math.round((box.width / box.height) * 10) / 10).toBe(3);
    if (process.env.SHOTS) await page.screenshot({ path: `${process.env.SHOTS}/qp-daily.png` });

    // Back to the original picture.
    await page.goto("/profile/questions");
    await edit();
    await page.getByRole("button", { name: "Use the original picture" }).click();
    await page.getByRole("button", { name: "Save" }).click();
    await expect(page.getByText("Question saved")).toBeVisible();
    await page.goto("/daily");
    await expect(page.getByRole("img", { name: "People sitting quietly by the sea at dawn" })).toBeVisible();
    // The photo it replaced is gone from storage.
    await expect.poll(() => db.attachment.count({ where: { userId: USER_ID, kind: "photo", createdAt: { gt: new Date(Date.now() - 5 * 60_000) } } })).toBe(0);
  } finally {
    await db.user.update({ where: { id: USER_ID }, data: { questions: null } });
    await db.$disconnect();
  }
});
