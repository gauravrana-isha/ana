import { test, expect } from "@playwright/test";
import { BUNDLES, CORE_SECTIONS, SECTION_KEYS, SECTIONS, sectionsOf, settingsOf } from "../../src/lib/bundles";
import { OFFLINE_SCREENS } from "../../src/lib/offline-screens";
import { bundlesFrom } from "../../src/lib/features";

/* The bundle registry holds together: every screen has one home, and is kept for offline use. */

test.describe("bundle registry", () => {
  test("every section is in exactly one bundle, or there for everyone", () => {
    for (const key of SECTION_KEYS) {
      const owners = BUNDLES.filter((b) => (b.sections as readonly string[]).includes(key)).length + ((CORE_SECTIONS as readonly string[]).includes(key) ? 1 : 0);
      expect(owners, key).toBe(1);
    }
  });

  test("every screen and every bundle's own page is saved for offline use", () => {
    for (const key of SECTION_KEYS) expect(OFFLINE_SCREENS).toContain(SECTIONS[key].href);
    for (const b of BUNDLES) for (const page of b.offline) expect(OFFLINE_SCREENS).toContain(page);
  });

  test("a bundle's sections and settings come with it", () => {
    expect(sectionsOf(["reflection"])).toEqual(["daily", "weekly", "commitment"]);
    expect(settingsOf(["sadhana", "reflection"])).toEqual(["practices", "questions"]);
    expect(bundlesFrom(["today", "daily", "people", "insights"])).toEqual(["reflection", "expressions"]);
  });
});

test.describe("bundles from older settings", () => {
  const row = (feature: string, allowed = true, enabled = true) => ({ feature, allowed, enabled });
  test("someone from before bundles keeps a bundle if any of its screens was on", async () => {
    const { effectiveBundles, effectiveFeatures } = await import("../../src/lib/features");
    // No rows at all: everything.
    expect(effectiveBundles([])).toEqual(["sadhana", "reflection", "expressions"]);
    // Tracker turned off, Weekly not allowed (Daily still on): Reflection stays, whole.
    const rows = [row("tracker", true, false), row("weekly", false)];
    expect(effectiveBundles(rows)).toEqual(["reflection", "expressions"]);
    expect(effectiveFeatures(rows)).toEqual(["today", "daily", "weekly", "expressions", "people", "commitment", "insights"]);
    // A bundle row, once the admin has set one, decides.
    expect(effectiveBundles([...rows, row("reflection", false), row("sadhana", true)])).toEqual(["sadhana", "expressions"]);
  });
});
