import { BUNDLES, SECTIONS, type BundleDef, type SectionKey } from "./bundles";

/*
 * The phone's tab bar: five tabs at most, never a "More".
 *
 * Home plus every screen of the person's bundles, when that fits in five: each screen is its
 * own tab (Reflection alone: Home · Daily · Weekly · Sankalpa). When it doesn't, each bundle is
 * one tab and its screens move inside it (switched from the page's title). With more than four
 * bundles, the person picks which four sit in the bar; the rest open from Home.
 *
 * Profile is the picture beside the bell on Home, and Insights is inside Profile, so neither
 * takes a tab. Plain logic, shared by the tab bar, the page title and Home.
 */

export const MAX_TABS = 5;
/** Slots for bundles when each bundle is one tab (Home takes the first). */
export const BUNDLE_SLOTS = MAX_TABS - 1;

export type Tab =
  | { kind: "home"; key: "today"; label: string; href: string }
  | { kind: "section"; key: SectionKey; label: string; href: string }
  | { kind: "bundle"; key: string; label: string; mark: SectionKey; sections: readonly SectionKey[] };

export interface NavPlan {
  /** "menus": a tab per screen; "bundles": a tab per bundle, its screens inside. */
  mode: "menus" | "bundles";
  tabs: Tab[];
  /** Bundles the person has that aren't in the bar (they open from Home). */
  offBar: BundleDef[];
}

const home: Tab = { kind: "home", key: "today", label: SECTIONS.today.label, href: SECTIONS.today.href };

/**
 * @param bundles  the person's bundles
 * @param pinned   bundles they chose for the bar, in order (used when there are more than four)
 */
export function planTabs(bundles: readonly string[], pinned: readonly string[] = [], registry: readonly BundleDef[] = BUNDLES): NavPlan {
  const mine = registry.filter((b) => bundles.includes(b.key));
  const screens = mine.flatMap((b) => [...b.sections]);
  if (1 + screens.length <= MAX_TABS) {
    return { mode: "menus", tabs: [home, ...screens.map((k): Tab => ({ kind: "section", key: k, label: SECTIONS[k].label, href: SECTIONS[k].href }))], offBar: [] };
  }
  // Their chosen bundles first (in the order chosen), then the rest in the usual order.
  const ordered = [...pinned.map((k) => mine.find((b) => b.key === k)).filter((b): b is BundleDef => !!b), ...mine.filter((b) => !pinned.includes(b.key))];
  const inBar = ordered.slice(0, BUNDLE_SLOTS);
  return {
    mode: "bundles",
    tabs: [home, ...inBar.map((b): Tab => ({ kind: "bundle", key: b.key, label: b.label, mark: b.mark, sections: b.sections }))],
    offBar: ordered.slice(BUNDLE_SLOTS),
  };
}

/** The bundle tab (in bundle mode) that a page belongs to, if any. */
export function bundleTabFor(plan: NavPlan, pathname: string) {
  return plan.tabs.find((t): t is Extract<Tab, { kind: "bundle" }> => t.kind === "bundle" && t.sections.some((s) => onSection(pathname, s)));
}

/** Whether a page is (or is inside) a section, e.g. /presence/abc is in Presence. */
export function onSection(pathname: string, section: SectionKey) {
  const href = SECTIONS[section].href;
  return pathname === href || pathname.startsWith(href + "/");
}

