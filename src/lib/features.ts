import { BUNDLES, CORE_SECTIONS, SECTIONS, sectionsOf, type BundleKey, type SectionKey } from "./bundles";

/*
 * Who can reach which screens. The screens and how they're bundled live in lib/bundles; which
 * bundles each person has lives in the UserFeature table (one row per bundle, set by an admin).
 * A "feature" is a section (a screen).
 */

export type FeatureKey = SectionKey;

/** Menu order: Today, then each bundle's screens, Insights last. */
const ORDER: FeatureKey[] = ["today", "tracker", "daily", "weekly", "expressions", "people", "commitment", "insights"];

export const FEATURES = ORDER.map((key) => ({ key, ...SECTIONS[key] }));

export const FEATURE_KEYS = FEATURES.map((f) => f.key);

export function isFeatureKey(value: string): value is FeatureKey {
  return (FEATURE_KEYS as string[]).includes(value);
}

export function featureByKey(key: FeatureKey) {
  return FEATURES.find((f) => f.key === key)!;
}

type Row = { feature: string; allowed: boolean; enabled: boolean };

/**
 * The bundles someone has. The admin gives bundles (a row per bundle, `allowed`); people don't
 * choose them. Someone with no bundle rows yet (from before bundles) has a bundle when any of
 * its screens was on for them (a missing row meant "on"), so nobody loses what they had.
 */
export function effectiveBundles(rows: Row[]): BundleKey[] {
  const byKey = new Map(rows.map((r) => [r.feature, r]));
  const legacyOn = (k: FeatureKey) => {
    const row = byKey.get(k);
    return !row || (row.allowed && row.enabled);
  };
  return BUNDLES.filter((b) => {
    const row = byKey.get(b.key);
    return row ? row.allowed : b.sections.some(legacyOn);
  }).map((b) => b.key);
}

/** The screens someone can reach: Home and Insights, and every screen of their bundles. */
export function effectiveFeatures(rows: Row[]): FeatureKey[] {
  const on = new Set<FeatureKey>([...CORE_SECTIONS, ...sectionsOf(effectiveBundles(rows))]);
  return FEATURE_KEYS.filter((k) => on.has(k));
}

/** The bundles someone has, from the screens they can reach. */
export function bundlesFrom(effective: readonly FeatureKey[]): BundleKey[] {
  return BUNDLES.filter((b) => b.sections.some((s) => effective.includes(s))).map((b) => b.key);
}
