import path from "node:path";
import type { Page } from "@playwright/test";
import { test, expect, outbox, waitingFiles } from "./fixtures";

// A pretend microphone and camera, already allowed.
test.use({ launchOptions: { args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"] }, permissions: ["microphone", "camera"] });

async function recordVoice(page: Page) {
  await page.goto("/moments");
  await page.locator("button:visible", { hasText: "New moment" }).first().click();
  await page.getByRole("dialog").getByRole("radio", { name: "Voice" }).click();
  await page.getByRole("button", { name: "Start recording" }).click();
  await page.waitForTimeout(1500);
  await page.getByRole("button", { name: "Stop recording" }).click();
  await page.getByRole("button", { name: "Record again" }).waitFor();
}

async function keep(page: Page, text: string) {
  const editor = page.getByRole("dialog").locator("[contenteditable=true]").first();
  await editor.click();
  await page.keyboard.type(text);
  await page.getByRole("button", { name: /Keep it/ }).click();
  await expect(page.getByText(text).first()).toBeVisible();
}

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

test("a voice note recorded offline says it's kept on the phone, not uploaded", async ({ page, context }) => {
  await context.setOffline(true);
  await recordVoice(page);
  await expect(page.getByText("✓ Kept on this phone. It goes up when you’re back online.")).toBeVisible();
  await expect(page.getByText("Kept on this phone ✓")).toBeVisible();
  await expect(page.getByText(/Uploaded/)).toHaveCount(0);
  await keep(page, "A voice note kept offline.");
  await expect.poll(() => waitingFiles(page)).toBe(1);
});

test("a voice note recorded online still plays offline later", async ({ page, context }) => {
  await recordVoice(page);
  await expect(page.getByText("✓ Uploaded. It’s safe to keep writing.")).toBeVisible();
  await keep(page, "A voice note for later.");
  await expect.poll(() => waitingFiles(page), { timeout: 20_000 }).toBe(0);

  await context.setOffline(true);
  await page.getByRole("link", { name: /Open .*A voice note for later/ }).first().click();
  await expect(page).toHaveURL(/\/moments\/c/);
  // Played from the copy kept on the phone (opened here into a blob), not the network.
  await expect.poll(() => page.evaluate(() => [...document.querySelectorAll("audio")].some((a) => a.src.startsWith("blob:")))).toBe(true);
});
