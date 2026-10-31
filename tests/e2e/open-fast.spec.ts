import { test, expect, SESSION_TOKEN } from "./fixtures";

/*
 * ana opens at once, like an app: a screen saved on this device shows straight away, without
 * waiting on the server, and is fetched again behind it.
 */

test.describe("opening", () => {
  test("a saved screen opens at once on a slow server, then is fetched again behind it", async ({ page, context }) => {
    // Every page and every call to the server takes 4 seconds.
    await context.route(/\/(home|sadhana|api\/)/, async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue().catch(() => {});
    });
    // (The browser's own early fetch of a page isn't slowed by the test, so it's turned off.)
    await page.evaluate(async () => (await navigator.serviceWorker.ready).navigationPreload?.disable());
    const before = await page.evaluate(async () => (await (await caches.open("ana-pages")).match("/home"))?.headers.get("date"));
    const started = Date.now();
    await page.goto("/home?source=pwa", { waitUntil: "commit" });
    await expect(page.getByText(/^Namaskaram/).first()).toBeVisible({ timeout: 3000 });
    const took = Date.now() - started;
    console.log(`Home shown in ${took} ms on a 4-second server`);
    expect(took).toBeLessThan(2500);

    // The saved copy was fetched again behind it.
    await expect
      .poll(() => page.evaluate(async () => (await (await caches.open("ana-pages")).match("/home"))?.headers.get("date")), { timeout: 15_000 })
      .not.toBe(before);
  });

  test("a saved screen the server no longer shows (signed out) loads again from the server", async ({ page, context }) => {
    await context.clearCookies();
    await page.goto("/sadhana");
    await expect(page).toHaveURL(/\/login/, { timeout: 15_000 });
    expect(await page.evaluate(async () => !!(await (await caches.open("ana-pages")).match("/sadhana")))).toBe(false);
  });

  test("the splash shows on the first open on a device only, and goes as soon as the screen is ready", async ({ browser, baseURL }) => {
    // A device that has never opened ana (the usual test page has the splash marked as seen).
    const context = await browser.newContext({ baseURL });
    await context.addCookies([{ name: "authjs.session-token", value: SESSION_TOKEN, url: baseURL! }]);
    const page = await context.newPage();
    const started = Date.now();
    await page.goto("/home");
    await expect(page.locator(".ana-splash")).toBeVisible();
    await expect.poll(() => page.evaluate(() => document.documentElement.classList.contains("splash"))).toBe(false);
    expect(Date.now() - started).toBeLessThan(2500);

    // Every open after that: no splash.
    await page.goto("/home");
    await page.waitForLoadState("domcontentloaded");
    expect(await page.evaluate(() => document.documentElement.classList.contains("splash"))).toBe(false);
    await context.close();
  });
});

test.describe("opening, steadily", () => {
  test("opening carries on the launch screen's plain ground (no logo), and it fades away once the journal is there", async ({ page }) => {
    await page.goto("/home?source=pwa", { waitUntil: "commit" });
    await expect(page.locator(".ana-logo-screen.is-plain").first()).toBeAttached();
    await expect(page.getByText(/^Namaskaram/).first()).toBeVisible();
    await expect(page.locator(".ana-logo-screen")).toHaveCount(0, { timeout: 3000 });
  });

  test("the quote's place is kept while it loads, so Home doesn't jump when it arrives", async ({ page, context }) => {
    // A phone with no quote kept yet, and a slow quote.
    await page.evaluate(
      () =>
        new Promise<void>((resolve) => {
          const open = indexedDB.open("keyval-store");
          open.onsuccess = () => {
            const tx = open.result.transaction("keyval", "readwrite");
            tx.objectStore("keyval").delete("ana-query-cache");
            tx.oncomplete = () => resolve();
          };
        })
    );
    await context.route(/\/api\/quote/, async (route) => {
      await new Promise((r) => setTimeout(r, 2500));
      await route.continue().catch(() => {});
    });
    await page.goto("/home?source=pwa");
    const below = page.getByRole("heading", { name: "Keep a moment" });
    await expect(below).toBeVisible();
    const before = (await below.boundingBox())!.y;
    await expect(page.getByRole("main").locator("figure blockquote")).toBeVisible({ timeout: 10_000 });
    const after = (await below.boundingBox())!.y;
    console.log(`cards below moved ${Math.round(after - before)}px when the quote arrived`);
    expect(Math.abs(after - before)).toBeLessThan(40);
  });

  test("opening never looks stuck: if it takes a while, the turning snake eases in on the plain ground", async ({ browser, baseURL }) => {
    // A device that hasn't unlocked yet, with a slow server: opening has to wait.
    const context = await browser.newContext({ baseURL });
    await context.addInitScript(() => localStorage.setItem("ana-splash", "1"));
    await context.addCookies([{ name: "authjs.session-token", value: SESSION_TOKEN, url: baseURL! }]);
    await context.route(/\/api\/vault$/, async (route) => {
      await new Promise((r) => setTimeout(r, 4000));
      await route.continue().catch(() => {});
    });
    const page = await context.newPage();
    await page.goto("/home");
    const opening = page.getByRole("status", { name: "Opening your journal" });
    await expect(opening).toBeVisible();
    const shown = () => opening.locator(".ana-late-in").evaluate((el) => Number(getComputedStyle(el).opacity));
    expect(await shown()).toBeLessThan(0.5); // at first, just the ground
    await expect.poll(shown, { timeout: 3000 }).toBeGreaterThan(0.9); // then the snake
    await context.close();
  });
});
