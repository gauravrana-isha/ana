import { BUNDLES, CORE_SECTIONS, SECTIONS, type BundleKey, type SectionKey } from "./bundles";

/*
 * Who can reach which screens. The screens and how they're bundled live in lib/bundles; who
 * may use what lives in the UserFeature table. A "feature" is a section (a screen).
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

/**
 * Effective features for a user. A missing row means "allowed and enabled",
 * so features added later reach existing users unless an admin restricts them.
 */
export function effectiveFeatures(
  rows: { feature: string; allowed: boolean; enabled: boolean }[]
): FeatureKey[] {
  const byKey = new Map(rows.map((r) => [r.feature, r]));
  return FEATURE_KEYS.filter((key) => {
    const row = byKey.get(key);
    return !row || (row.allowed && row.enabled);
  });
}

/** The bundles someone has: those with any of their screens. */
export function bundlesFrom(effective: readonly FeatureKey[]): BundleKey[] {
  return BUNDLES.filter((b) => b.sections.some((s) => effective.includes(s))).map((b) => b.key);
}

export { CORE_SECTIONS };
