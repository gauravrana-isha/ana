/**
 * Feature registry. Definitions live here (they are code); who can reach
 * what lives in the UserFeature table. Icons are mapped in the client nav.
 */
export const FEATURES = [
  {
    key: "today",
    label: "Today",
    href: "/today",
    description: "A calm start: the day's quote, your practices, and moments coming back to you.",
  },
  {
    key: "tracker",
    label: "Tracker",
    href: "/tracker",
    description: "Log your daily practices: time, count, minutes, done.",
  },
  {
    key: "daily",
    label: "Daily",
    href: "/daily",
    description: "A few quiet prompts at the end of each day.",
  },
  {
    key: "weekly",
    label: "Weekly",
    href: "/weekly",
    description: "Look back on the week, including seva, with a week in review beside it.",
  },
  {
    key: "expressions",
    label: "Expressions",
    href: "/expressions",
    description: "Moments worth keeping: writing, voice, video and photos, with the date and time.",
  },
  {
    key: "people",
    label: "People",
    href: "/people",
    description: "The people in your life, and every moment you've shared with them.",
  },
  {
    key: "commitment",
    label: "Commitment",
    href: "/commitment",
    description: "A letter to yourself about what you're committing to, read again when you choose.",
  },
  {
    key: "insights",
    label: "Insights",
    href: "/insights",
    description: "Gentle patterns in your practice, mood and moments. Never scores.",
  },
] as const;

export type FeatureKey = (typeof FEATURES)[number]["key"];

export const FEATURE_KEYS = FEATURES.map((f) => f.key) as FeatureKey[];

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
