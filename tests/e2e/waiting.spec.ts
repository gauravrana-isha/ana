import type { Page } from "@playwright/test";
import { test, expect, outbox } from "./fixtures";

/*
 * What's kept on the phone and not yet in the journal is shown quietly and honestly: a mark on
 * each item, a dot on the profile, the list of what's waiting (with anything turned down, to
 * try again or remove), what the phone holds, and a warning before signing out would lose it.
 */

async function writeMoment(page: Page, words: string) {
  await page.goto("/expressions");
  await page.locator("button:visible", { hasText: "New moment" }).first().click();
  const editor = page.getByRole("dialog").locator("[contenteditable=true]").first();
  await editor.waitFor();
  await editor.click();
  await page.keyboard.type(words);
  await page.getByRole("button", { name: /Keep it/ }).click();
  await page.getByRole("link", { name: new RegExp(`Open .*${words}`) }).first().waitFor();
}

test("a moment kept offline is marked, listed and dotted, then sent and the marks go", async ({ page, context }) => {
  await context.setOffline(true);
  await writeMoment(page, "Kept while offline.");

  const card = page.locator("article", { hasText: "Kept while offline." }).first();
  await expect(card.getByRole("img", { name: "Kept on this phone, not sent yet" })).toBeVisible();
  await expect(page.getByRole("img", { name: /waiting to send/ }).first()).toBeAttached();

  // The list of what's waiting, from the More sheet.
  await page.getByRole("button", { name: "More" }).click();
  await page.getByRole("button", { name: /Kept on this phone/ }).click();
  const sheet = page.getByRole("dialog", { name: "Waiting to send" });
  await expect(sheet.getByText("1 moment")).toBeVisible();
  await expect(sheet.getByText("A new moment")).toBeVisible();
  await expect(sheet.getByText(/Kept on your phone/)).toBeVisible();

  // Back online: sent, the list empties, and the marks and the dot go.
  await context.setOffline(false);
  await expect(sheet.getByText("Everything’s in your journal.")).toBeVisible({ timeout: 30_000 });
  await page.keyboard.press("Escape");
  await expect(card.getByRole("img", { name: "Kept on this phone, not sent yet" })).toHaveCount(0);
  await expect(page.getByRole("img", { name: /waiting to send/ })).toHaveCount(0);
  await expect.poll(() => outbox(page)).toEqual([]);
});

test("a save the journal turns down is kept, to try again or remove", async ({ page }) => {
  // A change to a moment that isn't there (as if removed on another device).
  await page.evaluate(
    () =>
      new Promise<void>((resolve) => {
        const open = indexedDB.open("keyval-store");
        open.onsuccess = () => {
          const tx = open.result.transaction("keyval", "readwrite");
          tx.objectStore("keyval").put([{ id: "cstaleeditnotthere0001", url: "/api/expressions/cnotthereanymore000000001", method: "PATCH", body: JSON.stringify({ kind: "writing" }), at: Date.now() }], "ana-outbox");
          tx.oncomplete = () => resolve();
        };
      })
  );
  await page.goto("/profile/device");
  await page.getByRole("button", { name: /Waiting to send/ }).click();
  const sheet = page.getByRole("dialog", { name: "Waiting to send" });
  await expect(sheet.getByText("What it changes is no longer there")).toBeVisible({ timeout: 20_000 });

  // Trying again is turned down again; removing it lets it go.
  await sheet.getByRole("button", { name: "Try again" }).click();
  await expect(sheet.getByText("What it changes is no longer there")).toBeVisible();
  await sheet.getByRole("button", { name: "Remove" }).click();
  await expect(sheet.getByText("Everything’s in your journal.")).toBeVisible();
});

test("On this phone shows what's kept and saves everything again", async ({ page }) => {
  await page.goto("/profile/device");
  await expect(page.getByRole("heading", { name: "On this phone" })).toBeVisible();
  await expect(page.getByText("Screens", { exact: true })).toBeVisible();
  await expect(page.getByText(/Everything was last saved/)).toBeVisible();
  await page.getByRole("button", { name: "Save everything now" }).click();
  await expect(page.getByText("Everything is saved on this phone.")).toBeVisible({ timeout: 60_000 });
});

test("signing out with things not yet sent asks first", async ({ page, context }) => {
  await context.setOffline(true);
  await writeMoment(page, "Not sent before signing out.");
  await page.goto("/profile");
  await page.locator("button:visible", { hasText: "Sign out" }).first().click();
  await expect(page.getByText("1 thing hasn't been sent yet. Signing out now would lose it.", { exact: false })).toBeVisible();
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page).toHaveURL(/\/profile/);
});
