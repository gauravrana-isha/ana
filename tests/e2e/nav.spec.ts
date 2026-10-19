import { test as plain, expect as plainExpect } from "@playwright/test";
import { test, expect, setBundles } from "./fixtures";
import { BUNDLES, BUNDLE_KEYS, type BundleDef } from "../../src/lib/bundles";
import { planTabs } from "../../src/lib/nav-plan";

/* Five tabs at most, never "More": a tab per screen when they fit, a tab per bundle when not. */

const labels = (bundles: string[], pinned?: string[], registry?: readonly BundleDef[]) => planTabs(bundles, pinned, registry).tabs.map((t) => t.label);

plain.describe("the tab bar rule", () => {
  plain("screens get their own tabs when Home and all of them fit in five", () => {
    plainExpect(labels(["reflection"])).toEqual(["Home", "Daily", "Weekly", "Sankalpa"]);
    plainExpect(labels(["sadhana", "reflection"])).toEqual(["Home", "Sadhana", "Daily", "Weekly", "Sankalpa"]);
    plainExpect(labels(["sadhana", "expressions"])).toEqual(["Home", "Sadhana", "Moments", "Presence"]);
    plainExpect(planTabs(["sadhana"]).mode).toBe("menus");
  });

  plain("otherwise each bundle is one tab, the whole bar at once", () => {
    plainExpect(labels(["reflection", "expressions"])).toEqual(["Home", "Reflection", "Presence"]);
    plainExpect(labels(["sadhana", "reflection", "expressions"])).toEqual(["Home", "Sadhana", "Reflection", "Presence"]);
    plainExpect(planTabs(["sadhana", "reflection", "expressions"]).tabs.every((t) => t.kind !== "section")).toBe(true);
  });

  plain("never more than five tabs, for every mix of bundles", () => {
    for (let mask = 1; mask < 1 << BUNDLE_KEYS.length; mask++) {
      const chosen = BUNDLE_KEYS.filter((_, i) => mask & (1 << i));
      plainExpect(planTabs(chosen).tabs.length, chosen.join("+")).toBeLessThanOrEqual(5);
    }
  });

  plain("with more than four bundles, the four chosen sit in the bar and the rest open from Home", () => {
    const many: BundleDef[] = ["a", "b", "c", "d", "e", "f"].map((key, i) => ({ ...BUNDLES[i % 3], key, label: key.toUpperCase() }));
    const all = many.map((b) => b.key);
    plainExpect(labels(all, [], many)).toEqual(["Home", "A", "B", "C", "D"]);
    plainExpect(planTabs(all, [], many).offBar.map((b) => b.key)).toEqual(["e", "f"]);
    // Chosen ones first, in the order chosen; a chosen bundle they no longer have is ignored.
    plainExpect(labels(all, ["f", "zz", "b"], many)).toEqual(["Home", "F", "B", "A", "C"]);
    plainExpect(planTabs(all, ["f", "zz", "b"], many).offBar.map((b) => b.key)).toEqual(["d", "e"]);
  });
});

test.describe("moving around on a phone", () => {
  test.afterEach(async ({ page }) => setBundles(page, ["sadhana", "reflection", "expressions"]));

  const tabs = (page: import("@playwright/test").Page) => page.locator("nav[aria-label=Main]:visible > div > a");

  test("all bundles: Home and a tab per bundle, no More, Profile is the picture on Home", async ({ page }) => {
    await page.goto("/home");
    await expect(tabs(page)).toHaveText(["Home", "Sadhana", "Reflection", "Presence"]);
    await expect(page.getByRole("button", { name: "More" })).toHaveCount(0);
    await page.getByRole("link", { name: "Profile" }).click();
    await expect(page).toHaveURL(/\/profile$/);
    // Insights and Access are reached from Profile.
    await expect(page.getByRole("link", { name: /^Insights/ }).first()).toBeVisible();
    await expect(page.getByRole("link", { name: /^Access/ }).first()).toBeVisible();
  });

  test("inside a bundle tab, the title switches screens: tap, the list, a faded title, a swipe", async ({ page }) => {
    // Sankalpa's one-time introduction, already read.
    await page.evaluate(() => localStorage.setItem("ana:commitment.intro", "yes"));
    await page.goto("/home");
    await tabs(page).filter({ hasText: "Reflection" }).click();
    await expect(page).toHaveURL(/\/daily$/);
    const title = page.getByRole("button", { name: /^Daily: switch to Weekly or Sankalpa/ });
    await expect(title).toBeVisible();

    // The list, from the title.
    await title.click();
    await page.getByRole("menuitem", { name: "Weekly" }).click();
    await expect(page).toHaveURL(/\/weekly$/);

    // A faded next title.
    await page.getByRole("link", { name: "Sankalpa", exact: true }).first().click();
    await expect(page).toHaveURL(/\/sankalpa$/);

    // A swipe to the left: round to the first.
    await page.evaluate(() => {
      const main = document.querySelector("main")!;
      const fire = (type: string, x: number) => {
        const e = new Event(type, { bubbles: true });
        Object.defineProperty(e, type === "touchend" ? "changedTouches" : "touches", { value: [{ clientX: x, clientY: 400 }] });
        main.dispatchEvent(e);
      };
      fire("touchstart", 320);
      fire("touchend", 120);
    });
    await expect(page).toHaveURL(/\/daily$/);

    // Tapping the open bundle's tab again lists its screens too.
    await tabs(page).filter({ hasText: "Reflection" }).click();
    await page.getByRole("menuitem", { name: "Weekly" }).click();
    await expect(page).toHaveURL(/\/weekly$/);

    // The tab returns to the screen last open in it.
    await tabs(page).filter({ hasText: "Home" }).click();
    await tabs(page).filter({ hasText: "Reflection" }).click();
    await expect(page).toHaveURL(/\/weekly$/);
  });

  test("Reflection alone: each of its screens is a tab, no title switch", async ({ page }) => {
    await setBundles(page, ["reflection"]);
    await page.goto("/home");
    await expect(tabs(page)).toHaveText(["Home", "Daily", "Weekly", "Sankalpa"]);
    await tabs(page).filter({ hasText: "Weekly" }).click();
    await expect(page).toHaveURL(/\/weekly$/);
    await expect(page.getByRole("button", { name: /switch to/ })).toHaveCount(0);
  });
});
