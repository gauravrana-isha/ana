import { PrismaClient } from "@prisma/client";
import { test, expect, USER_ID } from "./fixtures";

/** No letters, before and after (tests share one database). */
async function clearLetters() {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  try {
    await db.commitment.deleteMany({ where: { userId: USER_ID } });
  } finally {
    await db.$disconnect();
  }
}
test.beforeEach(clearLetters);
test.afterEach(clearLetters);

/* The sankalpa letter is written and kept with the same floating ✓ as Daily and Weekly. */

test("a sankalpa is written, kept with the floating ✓, and rewritten or left as it was", async ({ page }) => {
  await page.goto("/sankalpa");
  const intro = page.getByRole("dialog", { name: "Your sankalpa" });
  // The first visit explains what the letter is.
  await intro.getByRole("button", { name: "Begin the letter" }).click();
  const save = page.getByRole("button", { name: "Save letter" });
  await expect(save).toBeDisabled();
  await page.getByRole("textbox", { name: "Your sankalpa" }).fill("This year, the practice before the day.");
  await save.click();
  await expect(page.getByText("This year, the practice before the day.")).toBeVisible();
  // Rewriting: the pen, then Cancel leaves the letter as it was.
  await page.getByRole("button", { name: "Edit letter" }).click();
  await page.getByRole("textbox", { name: "Your sankalpa" }).fill("Something else.");
  await page.getByRole("button", { name: "Cancel" }).click();
  await expect(page.getByText("This year, the practice before the day.")).toBeVisible();
});
