import { test, expect } from "./fixtures";

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
});
