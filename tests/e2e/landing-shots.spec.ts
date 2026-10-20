import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";
import path from "node:path";
import { test, PHRASE_FILE } from "./fixtures";

/*
 * Makes the landing page's screenshots (public/landing): the real app, with the staging seed's
 * made-up journal. Not part of the normal run:
 *   LANDING_SHOTS=<folder> TEST_DATABASE_URL=… npx playwright test landing-shots
 * then convert the PNGs to 780px-wide WebP into public/landing.
 */
const OUT = process.env.LANDING_SHOTS ?? "";
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 3 });

test("landing screenshots", async ({ page }) => {
  test.skip(!OUT, "Only when making the landing screenshots (set LANDING_SHOTS)");
  test.setTimeout(400_000);
  execSync("npx tsx scripts/seed-staging.ts --email e2e@example.com --force", { env: { ...process.env, SEED_DATABASE_URL: process.env.TEST_DATABASE_URL }, input: readFileSync(PHRASE_FILE, "utf8") });
  // A real-looking name for the greeting and picture.
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await db.user.update({ where: { email: "e2e@example.com" }, data: { name: "Meera Iyer" } });
  await db.$disconnect();
  await page.evaluate(() => { localStorage.setItem("ana:hint.bundle-title", "1"); localStorage.setItem("ana:commitment.intro", "yes"); });
  await page.waitForTimeout(65_000);
  for (const theme of ["light", "dark"]) {
    await page.evaluate((t) => { document.cookie = "ana-theme=" + t + "; path=/; max-age=31536000"; }, theme);
    const shot = async (name: string, url: string, ready: () => Promise<unknown>) => {
      await page.goto(url);
      await ready();
      // Isha's quote stays out of the pictures until permission is settled.
      await page.addStyleTag({ content: "main figure:has(blockquote){display:none!important}" });
      await page.waitForTimeout(1200);
      await page.screenshot({ path: path.join(OUT, name + "-" + theme + ".png") });
    };
    await shot("home", "/home", () => page.getByText("Today's practices").waitFor());
    await shot("sadhana", "/sadhana", () => page.getByRole("button", { name: "Edit practices" }).waitFor());
    await shot("daily", "/daily", () => page.locator("[aria-roledescription=card]").first().waitFor());
    await shot("moments", "/moments", () => page.getByText("Sunrise at the lake").first().waitFor());
    await shot("presence", "/presence", () => page.getByText("Amma").first().waitFor());
    await shot("insights", "/insights", () => page.getByRole("heading", { name: "Mood, the last eight weeks" }).waitFor());
  }
});
