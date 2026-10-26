import { test as plain, expect } from "@playwright/test";
import { test } from "./fixtures";

/* The front door: visitors see what ana is and how to begin; people signed in go to their journal. */

plain("a visitor sees the landing page, and Begin leads to sign in", async ({ page }) => {
  await page.goto("/");
  await expect(page.getByRole("heading", { level: 1 })).toHaveText("Absolute devotion to what's here and now");
  // On a phone each part is just its headline and its screen (the rest shows on wider screens).
  for (const name of ["Tick your practices. See your rhythm.", "A few quiet questions, one at a time.", "Your experience and nothing more."]) {
    await expect(page.getByRole("heading", { name })).toBeVisible();
  }
  await expect(page.getByText("Your own practices, in your order")).toBeHidden();
  await expect(page.getByRole("heading", { name: "Your logger is yours alone." })).toBeVisible();
  // The app in use, looping; the quiet line; the words sealed as they leave the phone.
  await expect(page.locator("video[src*='hero-light']")).toBeVisible();
  await expect(page.getByText("Just here and now", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Logger for you, your reflections and moments that matter.")).toBeVisible();
  await page.getByText("What leaves your phone").scrollIntoViewIfNeeded();
  await expect(page.getByText(/^e1:/)).toBeVisible({ timeout: 8000 });
  // Nothing makes the page wider than the phone.
  expect(await page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)).toBe(0);
  await page.getByRole("link", { name: /^Begin/ }).first().click();
  await expect(page).toHaveURL(/\/login/);
});

test("someone signed in goes straight to their logger", async ({ page }) => {
  await page.goto("/");
  await expect(page).toHaveURL(/\/home/);
});

plain("visitors can read the terms and privacy", async ({ page }) => {
  await page.goto("/terms");
  await expect(page.getByRole("heading", { level: 1, name: "Terms" })).toBeVisible();
  await expect(page.getByText("courts of Coimbatore")).toBeVisible();
  await expect(page.getByRole("banner").getByRole("link", { name: "Sign in" })).toBeVisible();
  await page.goto("/privacy");
  await expect(page.getByRole("heading", { level: 1, name: "Privacy" })).toBeVisible();
  await expect(page.getByRole("link", { name: "grana4175@gmail.com" }).first()).toBeVisible();
});

test("someone signed in reading the terms is led back into ana, not to sign in", async ({ page }) => {
  await page.goto("/terms");
  const header = page.getByRole("banner");
  await expect(header.getByRole("link", { name: "Open ana" })).toBeVisible();
  await expect(header.getByRole("link", { name: "Sign in" })).toHaveCount(0);
});
