import { test, expect } from "@playwright/test";
import { PrismaClient } from "@prisma/client";
import { SESSION_TOKEN, USER_ID } from "./fixtures";

/*
 * Every way in lost: "Start over" deletes the journal (it can't be read without its key) and
 * leads to setting up a new key. The account stays.
 */

test("someone who has lost every key can start over with a new, empty journal", async ({ page, context, baseURL }) => {
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  // The test member's journal lock is put back afterwards, for the other tests.
  const before = await db.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { vaultAt: true, vaultCheck: true, vaultSealedAt: true } });
  const keys = await db.vaultKey.findMany({ where: { userId: USER_ID } });
  const practices = await db.practice.findMany({ where: { userId: USER_ID } });
  await db.practice.create({ data: { userId: USER_ID, name: "e1:test", iconName: "sun", tier: "CUSTOM", order: 99, fields: [] } });
  try {
    await context.addInitScript(() => localStorage.setItem("ana-splash", "1"));
    await context.addCookies([{ name: "authjs.session-token", value: SESSION_TOKEN, url: baseURL! }]);
    await page.goto("/home");
    await page.getByText("Unlock your journal").waitFor();

    await page.getByRole("button", { name: "Start over" }).click();
    await expect(page.getByRole("heading", { name: "Start over" })).toBeVisible();
    const go = page.getByRole("button", { name: "Delete everything and start over" });
    await expect(go).toBeDisabled();
    await page.getByLabel(/Type .start over. to confirm/).fill("Start Over");
    await expect(go).toBeEnabled();
    if (process.env.SHOTS) {
      await page.waitForTimeout(500);
      await page.screenshot({ path: `${process.env.SHOTS}/start-over.png` });
    }
    await go.click();

    // A new key is set up next.
    await expect(page.getByRole("button", { name: /^(Continue|Lock my journal)$/ })).toBeVisible({ timeout: 20_000 });
    expect(await db.vaultKey.count({ where: { userId: USER_ID } })).toBe(0);
    expect(await db.practice.count({ where: { userId: USER_ID } })).toBe(0);
    expect((await db.user.findUniqueOrThrow({ where: { id: USER_ID }, select: { vaultAt: true } })).vaultAt).toBeNull();
  } finally {
    await db.vaultKey.deleteMany({ where: { userId: USER_ID } });
    await db.vaultKey.createMany({ data: keys });
    await db.user.update({ where: { id: USER_ID }, data: before });
    await db.practice.deleteMany({ where: { userId: USER_ID } });
    await db.practice.createMany({ data: practices.map((p) => ({ ...p, fields: p.fields ?? [] })) });
    await db.$disconnect();
  }
});
