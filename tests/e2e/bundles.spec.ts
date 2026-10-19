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
