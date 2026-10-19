import { readFileSync } from "node:fs";
import path from "node:path";
import { test as base, expect, type Page } from "@playwright/test";
import { PrismaClient } from "@prisma/client";

/** The member global-setup creates. */
export const USER_ID = "e2etestmember000000000000";
export const SESSION_TOKEN = "e2e-session-token";
export const PHRASE_FILE = path.join(__dirname, ".auth", "phrase.txt");

/**
 * `page`: signed in as the test member, splash skipped, journal unlocked with the recovery
 * phrase, and given a moment to save every screen for offline use.
 */
export const test = base.extend<{ page: Page }>({
  page: async ({ page, context, baseURL }, provide) => {
    await context.addInitScript(() => sessionStorage.setItem("ana-splash", "1"));
    await context.addCookies([{ name: "authjs.session-token", value: SESSION_TOKEN, url: baseURL! }]);
    await page.goto("/home");
    await page.getByText("Unlock your journal").waitFor();
    await page.getByRole("button", { name: /Use your recovery words/ }).click();
    await page.getByLabel("Word 1", { exact: true }).fill(readFileSync(PHRASE_FILE, "utf8").trim());
    await page.getByRole("button", { name: "Unlock" }).click();
    await expect(page.getByRole("heading", { name: "Home", exact: true })).toBeAttached();
    await readyOffline(page);
    await provide(page);
  },
});

export { expect };

/**
 * Wait until everything is on the device for offline use: every screen saved by the service
 * worker, and the journal's data written to its encrypted copy (a moment after it loads).
 */
export async function readyOffline(page: Page) {
  await expect
    .poll(() => page.evaluate(async () => (await (await caches.open("ana-pages")).keys()).length), { timeout: 60_000 })
    .toBeGreaterThanOrEqual(15);
  await expect
    .poll(
      () =>
        page.evaluate(
          () =>
            new Promise<number>((resolve) => {
              const open = indexedDB.open("keyval-store");
              open.onerror = () => resolve(0);
              open.onsuccess = () => {
                const get = open.result.transaction("keyval").objectStore("keyval").get("ana-query-cache");
                get.onsuccess = () => resolve(String(get.result ?? "").length);
              };
            })
        ),
      { timeout: 30_000 }
    )
    .toBeGreaterThan(5_000);
}

/** Give the test member these bundles (as the admin they are), and nothing else. */
export async function setBundles(page: Page, bundles: string[]) {
  const all = ["sadhana", "reflection", "expressions"];
  const res = await page.request.patch(`/api/admin/users/${USER_ID}`, { data: { bundles: Object.fromEntries(all.map((b) => [b, bundles.includes(b)])) } });
  expect(res.ok(), await res.text()).toBe(true);
}

/** Start from a day and a week not answered yet (tests share one database). */
export async function clearReflections() {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  try {
    await db.dailyReflection.deleteMany({ where: { userId: USER_ID } });
    await db.weeklyReflection.deleteMany({ where: { userId: USER_ID } });
  } finally {
    await db.$disconnect();
  }
}

/** Saves waiting in the outbox (method and path, ids shortened). */
export function outbox(page: Page): Promise<string[]> {
  return page.evaluate(
    () =>
      new Promise((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const get = open.result.transaction("keyval").objectStore("keyval").get("ana-outbox");
          get.onsuccess = () => resolve(((get.result ?? []) as { method: string; url: string }[]).map((x) => `${x.method} ${x.url.replace(/\/[a-z0-9]{20,}/g, "/:id")}`));
        };
        open.onerror = () => resolve([]);
      })
  );
}

/** Files (photos, voice notes, videos) waiting to go up. */
export function waitingFiles(page: Page): Promise<number> {
  return page.evaluate(
    () =>
      new Promise<number>((resolve) => {
        const open = indexedDB.open("ana-media");
        open.onerror = () => resolve(0);
        open.onsuccess = () => {
          try {
            const keys = open.result.transaction("pending").objectStore("pending").getAllKeys();
            keys.onsuccess = () => resolve(keys.result.length);
            keys.onerror = () => resolve(0);
          } catch {
            resolve(0); // no files kept yet
          }
        };
      })
  );
}

/** Pull down from the top of the page, as a finger would (touch events on <main>). */
export async function pullDown(page: Page, release = true) {
  const touch = (type: string, y: number) =>
    page.evaluate(([type, y]) => {
      const e = new Event(type as string, { bubbles: true, cancelable: true });
      Object.defineProperty(e, "touches", { value: type === "touchend" ? [] : [{ identifier: 1, clientX: 200, clientY: y }] });
      document.querySelector("main")!.dispatchEvent(e);
    }, [type, y] as const);
  await touch("touchstart", 150);
  for (const y of [220, 300, 380]) {
    await touch("touchmove", y);
    await page.waitForTimeout(60);
  }
  if (release) await touch("touchend", 380);
}
