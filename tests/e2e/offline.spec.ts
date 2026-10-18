import { test, expect, outbox, pullDown } from "./fixtures";

/*
 * ana works offline, end to end: every screen opens, anything can be added, and it all reaches
 * the server once the connection is back.
 */

test.describe("offline", () => {
  test("every screen opens offline, as itself", async ({ page, context }) => {
    await context.setOffline(true);
    for (const [path, heading] of [
      ["/tracker", "Tracker"],
      ["/daily", "Daily reflection"],
      ["/weekly", "Weekly"],
      ["/expressions", "Expressions"],
      ["/people", "People"],
      ["/commitment", "My commitment"],
      ["/insights", "Insights"],
      ["/profile", "Profile"],
      ["/today?source=pwa", "Today"],
    ]) {
      await page.goto(path);
      await expect(page.getByRole("heading", { level: 1 }).first(), path).toContainText(heading);
      await expect(page.getByText("Not on this phone yet")).toHaveCount(0);
    }
  });

  test("moving between screens works offline (tab bar)", async ({ page, context }) => {
    await context.setOffline(true);
    for (const name of ["Tracker", "Expressions", "Today"]) {
      await page.locator("nav a:visible", { hasText: new RegExp(`^${name}$`) }).first().click();
      await expect(page.getByRole("heading", { level: 1 }).first()).toContainText(name);
    }
  });

  test("a page never saved shows the offline page, not another screen", async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto("/somewhere-never-saved");
    await expect(page.getByRole("heading", { name: "Not on this phone yet" })).toBeVisible();
  });

  test("things added offline show at once and reach the server when back online", async ({ page, context }) => {
    await context.setOffline(true);
    await expect(page.getByText("You're offline · everything still works here")).toBeVisible();

    // A moment, written offline, opens offline.
    await page.goto("/expressions");
    await page.locator("button:visible", { hasText: "New moment" }).first().click();
    const editor = page.getByRole("dialog").locator("[contenteditable=true]").first();
  await editor.waitFor();
  await editor.click();
    await page.keyboard.type("Written offline, by the river.");
    await page.getByRole("button", { name: /Keep it/ }).click();
    // A person taps it a moment after it appears (not within the same few milliseconds).
    await page.getByRole("link", { name: /Open .*Written offline/ }).first().waitFor();
    await page.waitForTimeout(300);
    await page.getByRole("link", { name: /Open .*Written offline/ }).first().click();
    await expect(page).toHaveURL(/\/expressions\/c/);
    await expect(page.getByText("Written offline, by the river.").first()).toBeVisible();

    // A person, added offline, opens offline.
    await page.goto("/people");
    await page.getByText("Add a person").first().click();
    await page.getByPlaceholder("Their name").fill("Met Offline");
    await page.getByRole("button", { name: "Add", exact: true }).click();
    await page.getByText("Met Offline").first().click();
    await expect(page).toHaveURL(/\/people\/c/);

    // A practice from the library, and a tick.
    await page.goto("/profile/practices");
    await page.getByRole("button", { name: /Add or change practices/ }).click();
    await page.getByText("Library", { exact: true }).click();
    await page.getByRole("button", { name: "Add Isha Kriya" }).click();
    // A person sees it added (✓) before moving on.
    await expect(page.getByRole("button", { name: "Remove Isha Kriya" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
    await page.goto("/tracker");
    await page.getByRole("button", { name: "Isha Kriya done" }).click();

    expect(await outbox(page)).toEqual(expect.arrayContaining(["POST /api/expressions", "POST /api/people", "POST /api/practices"]));

    // Back online: the saves go out, counted down.
    await page.goto("/today");
    await context.setOffline(false);
    await expect(page.getByText("All saved")).toBeVisible({ timeout: 30_000 });
    await expect.poll(() => outbox(page)).toEqual([]);
    const moments = await (await page.request.get("/api/expressions")).json();
    expect(JSON.stringify(moments)).toContain('"kind":"writing"');
  });

  test("pull to refresh offline doesn't reload the page; the pen stays put", async ({ page, context }) => {
    await page.goto("/daily");
    await context.setOffline(true);
    await page.evaluate(() => ((window as unknown as { marker: number }).marker = 1));
    // The floating pen (when there is one: a day already reflected on) doesn't move with the pull.
    const pen = page.getByRole("button", { name: /Edit reflection|Save reflection/ });
    const hasPen = (await pen.count()) > 0;
    const before = hasPen ? await pen.first().boundingBox() : null;
    await pullDown(page, false);
    const during = hasPen ? await pen.first().boundingBox() : null;
    if (before && during) expect(Math.abs(before.y - during.y)).toBeLessThan(2);
    await pullDown(page);
    await expect(page.getByText("Offline · this is everything on your phone")).toBeVisible();
    expect(await page.evaluate(() => (window as unknown as { marker: number }).marker)).toBe(1);
  });

  test("Access says it needs a connection", async ({ page, context }) => {
    await context.setOffline(true);
    await page.goto("/admin");
    await expect(page.getByText("Access needs a connection.", { exact: false })).toBeVisible();
  });

  test("the theme holds offline", async ({ page, context }) => {
    await page.evaluate(() => (document.cookie = "ana-theme=dark; path=/; max-age=31536000"));
    await context.setOffline(true);
    await page.goto("/insights");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });
});
