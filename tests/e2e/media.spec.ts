import path from "node:path";
import { test, expect, outbox, waitingFiles } from "./fixtures";

/*
 * Photos (and voice notes and videos, which take the same path) added offline are kept on the
 * phone, encrypted, shown from there, and go up before the moment that names them.
 */

test("a photo added offline shows at once and is uploaded, linked to its moment, when back online", async ({ page, context }) => {
  await page.goto("/moments");
  await page.locator("button:visible", { hasText: "New moment" }).first().click();
  await page.getByRole("dialog").getByRole("radio", { name: "Photo" }).click();

  await context.setOffline(true);
  await page.locator('input[type=file][accept="image/*"][multiple]').setInputFiles(path.join(__dirname, "river.jpg"));
  const editor = page.getByRole("dialog").locator("[contenteditable=true]").first();
  await editor.waitFor();
  await editor.click();
  await page.keyboard.type("A photo kept offline.");
  await page.getByRole("button", { name: /Keep it/ }).click();

  await expect(page.getByText("A photo kept offline.").first()).toBeVisible();
  // Shown from the copy on the phone (a decrypted blob), not the network.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("img")].filter((i) => i.src.startsWith("blob:") && i.naturalWidth > 0).length)).toBeGreaterThan(0);
  await expect.poll(() => waitingFiles(page)).toBe(1);

  await context.setOffline(false);
  await expect.poll(() => waitingFiles(page), { timeout: 30_000 }).toBe(0);
  await expect.poll(() => outbox(page), { timeout: 30_000 }).toEqual([]);

  // Signed in as the page is: the moment arrived with its photo attached.
  const moments = (await (await page.request.get("/api/expressions")).json()) as { items: { attachments: unknown[] }[] };
  expect(moments.items.some((m) => m.attachments.length === 1)).toBe(true);
});
