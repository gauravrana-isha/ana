import { execSync } from "node:child_process";
import { mkdirSync, readFileSync, readdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { test, PHRASE_FILE } from "./fixtures";

/*
 * Records the landing page's hero loop: the real app, with the staging seed's made-up journal,
 * in use: a practice ticked, the evening question written, a photo kept as a moment. Not part
 * of the normal run:
 *   LANDING_VIDEO=<folder> TEST_DATABASE_URL=… npx playwright test landing-video
 * then encode the WebM recordings to MP4 for public/landing (see the README in tests/e2e).
 */
const OUT = process.env.LANDING_VIDEO ?? "";
test.use({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2 });

test("landing hero loop", async ({ page }) => {
  test.skip(!OUT, "Only when making the landing video (set LANDING_VIDEO)");
  test.setTimeout(600_000);
  execSync("npx tsx scripts/seed-staging.ts --email e2e@example.com --force", { env: { ...process.env, SEED_DATABASE_URL: process.env.TEST_DATABASE_URL }, input: readFileSync(PHRASE_FILE, "utf8") });
  const { PrismaClient } = await import("@prisma/client");
  const db = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
  await db.user.update({ where: { email: "e2e@example.com" }, data: { name: "Meera Iyer" } });
  await db.dailyReflection.deleteMany({ where: { user: { email: "e2e@example.com" }, date: new Date(new Date().toISOString().slice(0, 10)) } });
  await db.$disconnect();
  await page.evaluate(() => {
    localStorage.setItem("ana:hint.bundle-title", "1");
    localStorage.setItem("ana:commitment.intro", "yes");
  });
  await page.waitForTimeout(65_000); // the device's copies are no longer fresh: the seeded journal shows
  await page.goto("/home");
  await page.getByText("Today's practices").waitFor();
  await page.waitForTimeout(2000);
  // Frames straight from Chrome (sharper than a recorded window), assembled with ffmpeg after.
  const cdp = await page.context().newCDPSession(page);
  await page.addStyleTag({ content: "main figure:has(blockquote){display:none!important}" });
  for (const theme of ["light", "dark"] as const) {
    // Each take starts from the same morning: nothing ticked, written or kept today yet.
    const fresh = new PrismaClient({ datasources: { db: { url: process.env.TEST_DATABASE_URL } } });
    const me = await fresh.user.findUniqueOrThrow({ where: { email: "e2e@example.com" } });
    const today = new Date(new Date().toISOString().slice(0, 10));
    await fresh.dayLog.deleteMany({ where: { userId: me.id, date: today } });
    await fresh.dailyReflection.deleteMany({ where: { userId: me.id, date: today } });
    // Moments removed the way ana removes them, so phones drop their copies too.
    const gone = await fresh.expression.findMany({ where: { userId: me.id, date: today }, select: { id: true } });
    await fresh.expression.deleteMany({ where: { id: { in: gone.map((g) => g.id) } } });
    await fresh.deletion.createMany({ data: gone.map((g) => ({ userId: me.id, kind: "moment", recordId: g.id })) });
    await fresh.$disconnect();
    await page.waitForTimeout(31_000); // so the screens fetch the fresh morning
    const dir = path.join(OUT, theme);
    mkdirSync(dir, { recursive: true });
    await page.evaluate((t) => (document.cookie = "ana-theme=" + t + "; path=/; max-age=31536000"), theme);
    await page.goto("/home");
    await page.addStyleTag({ content: "main figure:has(blockquote){display:none!important}" });
    await page.getByText("Today's practices").first().waitFor();
    await page.waitForTimeout(1200);
    const frames: { file: string; at: number }[] = [];
    const onFrame = async (f: { data: string; sessionId: number; metadata: { timestamp?: number } }) => {
      const file = path.join(dir, `f${String(frames.length).padStart(5, "0")}.jpg`);
      frames.push({ file, at: f.metadata.timestamp ?? Date.now() / 1000 });
      writeFileSync(file, Buffer.from(f.data, "base64"));
      await cdp.send("Page.screencastFrameAck", { sessionId: f.sessionId }).catch(() => {});
    };
    cdp.on("Page.screencastFrame", onFrame);
    await cdp.send("Page.startScreencast", { format: "jpeg", quality: 88, maxWidth: 780, maxHeight: 1688, everyNthFrame: 1 });
    await page.waitForTimeout(1600);
    // 1. A practice ticked.
    await page.getByText("Today's practices").first().scrollIntoViewIfNeeded();
    await page.waitForTimeout(900);
    await page.getByRole("button", { name: "Isha Kriya done" }).first().click();
    await page.waitForTimeout(1500);
    // 2. The evening question, written.
    await page.locator("nav[aria-label=Main] a", { hasText: "Reflection" }).click();
    const card = page.locator("[aria-roledescription=card]").first();
    await card.waitFor();
    await page.waitForTimeout(900);
    await card.locator("textarea").click();
    await card.locator("textarea").pressSequentially("Twice today. Once at dawn by the river, once before sleep.", { delay: 45 });
    await page.mouse.click(20, 140);
    await page.waitForTimeout(1300);
    // 3. A photo kept as a moment.
    await page.goto("/moments");
    await page.getByText("Sunrise at the lake").first().waitFor();
    await page.waitForTimeout(700);
    await page.locator("button:visible", { hasText: "New moment" }).first().click();
    await page.getByRole("dialog").getByRole("radio", { name: "Photo" }).click();
    await page.locator('input[type=file][accept="image/*"][multiple]').setInputFiles(path.join(__dirname, "dawn.jpg"));
    const editor = page.getByRole("dialog").locator("[contenteditable=true]").first();
    await editor.waitFor();
    await editor.click();
    await page.keyboard.type("The river at dawn.", { delay: 50 });
    await page.waitForTimeout(500);
    await page.getByRole("button", { name: /Keep it/ }).click();
    await page.getByText("The river at dawn.").first().waitFor();
    await page.waitForTimeout(2200);
    await cdp.send("Page.stopScreencast");
    cdp.off("Page.screencastFrame", onFrame);
    // A list for ffmpeg: each frame shown until the next one arrived.
    const lines = frames.flatMap((f, k) => [`file '${f.file}'`, `duration ${Math.max(0.001, (frames[k + 1]?.at ?? f.at + 0.04) - f.at).toFixed(4)}`]);
    writeFileSync(path.join(OUT, `${theme}.txt`), lines.join("\n") + `\nfile '${frames[frames.length - 1].file}'\n`);
  }
  console.log(readdirSync(OUT).join(" "));
});
