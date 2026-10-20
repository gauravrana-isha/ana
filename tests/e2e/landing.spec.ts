import { test as plain, expect } from "@playwright/test";
import { test } from "./fixtures";

/* The front door: visitors see what ana is and how to begin; people signed in go to their journal. */

plain("a visitor sees the landing page, and Begin leads to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Absolute devotion to what's here and now.");
  for (const name of ["Tick your practices. See your rhythm.", "A few quiet questions, one at a time.", "Keep the moments, and who was with you.", "Your journal is yours alone."]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  // The app in use, looping; the quiet line; the words sealed as they leave the phone.
  await expect(page.locator("video[src*='hero-light']")).toBeVisible();
  await expect(page.getByText("Just here and now.")).toBeVisible();
  await page.getByText("What leaves your phone").scrollIntoViewIfNeeded();
  await expect(page.getByText(/^e1:/)).toBeVisible({ timeout: 8000 });
  // Nothing makes the page wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.getByRole("link", { name: /^Begin/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("someone signed in goes straight to their journal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/home/);
});
