import { test as plain, expect } from "@playwright/test";
import { test } from "./fixtures";

/* The front door: visitors see what ana is and how to begin; people signed in go to their journal. */

plain("a visitor sees the landing page, and Begin leads to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Absolute devotion towards what is there at present.");
  for (const name of ["Tick your practices. See your rhythm.", "A few quiet questions, one at a time.", "Keep the moments, and who was with you.", "Your journal is yours alone."]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  // Screens are real images, and nothing makes the page wider than the phone.
  await expect(page.getByRole("img", { name: /ana's Home/ })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.getByRole("link", { name: /^Begin/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("someone signed in goes straight to their journal", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/home/);
});
