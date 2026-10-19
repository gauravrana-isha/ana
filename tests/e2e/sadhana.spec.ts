import { test, expect } from "./fixtures";

/* Practices are added, edited and removed from the Sadhana page itself, as from Profile. */

test("Edit practices on the Sadhana page: the list, editing one, adding from the library", async ({ page }) => {
  await page.goto("/sadhana");
  await expect(page.getByText("No practices yet.").or(page.getByRole("button", { name: "Edit practices" }))).toBeVisible();
  // With none yet, add one first.
  if (await page.getByText("No practices yet.").isVisible()) {
    await page.getByRole("button", { name: /Add practices/ }).click();
    await page.getByText("Library", { exact: true }).click();
    await page.getByRole("button", { name: "Add Isha Kriya" }).click();
    await expect(page.getByRole("button", { name: "Remove Isha Kriya" }).first()).toBeVisible();
    await page.keyboard.press("Escape");
  }

  await page.getByRole("button", { name: "Edit practices" }).click();
  const sheet = page.getByRole("dialog", { name: "Your practices" });
  await expect(sheet).toBeVisible();
  const first = sheet.getByRole("button", { name: /^Edit / }).first();
  const name = (await first.getAttribute("aria-label"))!.replace(/^Edit /, "");
  await first.click();
  // The practice's own editor opens over the list.
  await expect(page.getByRole("dialog").filter({ hasText: name }).last()).toBeVisible();
  await page.keyboard.press("Escape");
  // And the library, to add or change practices.
  await sheet.getByRole("button", { name: /Add or change practices/ }).click();
  await expect(page.getByText("Library", { exact: true })).toBeVisible();
});
