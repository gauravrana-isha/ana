/*
 * What ana is made of. Sections are the screens (each its own menu); bundles group them into
 * what a person is given: Sadhana, Reflection, Expressions (Music later). Home and Insights
 * are there for everyone and show only what the chosen bundles bring.
 *
 * Everything else (navigation, Home, Insights, Profile, onboarding, offline save-ahead, the
 * Access page) reads this registry and never names a bundle itself. A new bundle is a new
 * entry here (plus its screens and its parts in src/bundles); nothing else needs to change.
 *
 * Plain data: shared by the server, the app and the service worker.
 */

export interface SectionDef {
  label: string;
  href: string;
  /** One line, for search and the Access page. */
  description: string;
}

export const SECTIONS = {
  today: { label: "Today", href: "/today", description: "A calm start: the day's quote, your practices, and moments coming back to you." },
  insights: { label: "Insights", href: "/insights", description: "Gentle patterns in what you keep. Never scores." },
  tracker: { label: "Tracker", href: "/tracker", description: "Log your daily practices: time, count, minutes, done." },
  daily: { label: "Daily", href: "/daily", description: "A few quiet prompts at the end of each day." },
  weekly: { label: "Weekly", href: "/weekly", description: "Look back on the week, including seva, with a week in review beside it." },
  commitment: { label: "Commitment", href: "/commitment", description: "A letter to yourself about what you're committing to, read again when you choose." },
  expressions: { label: "Expressions", href: "/expressions", description: "Moments worth keeping: writing, voice, video and photos, with the date and time." },
  people: { label: "People", href: "/people", description: "The people in your life, and every moment you've shared with them." },
} as const satisfies Record<string, SectionDef>;

export type SectionKey = keyof typeof SECTIONS;
export const SECTION_KEYS = Object.keys(SECTIONS) as SectionKey[];

/** There for everyone, whatever bundles they have. */
export const CORE_SECTIONS = ["today", "insights"] as const satisfies readonly SectionKey[];

/** A part of Profile → Settings that only some bundles bring. */
export type BundleSetting = "practices" | "questions";

export interface BundleDef {
  key: string;
  label: string;
  /** One line, for the Access page. */
  description: string;
  /** Its screens, in menu order. */
  sections: readonly SectionKey[];
  /** Its parts of Profile → Settings. */
  settings: readonly BundleSetting[];
  /** Its steps when someone first joins. */
  onboarding: readonly "practices"[];
  /** Its pages kept for offline use beyond its sections (its settings, say). */
  offline: readonly string[];
}

export const BUNDLES = [
  {
    key: "sadhana",
    label: "Sadhana",
    description: "Your daily practices, logged: time, count, minutes, done.",
    sections: ["tracker"],
    settings: ["practices"],
    onboarding: ["practices"],
    offline: ["/profile/practices"],
  },
  {
    key: "reflection",
    label: "Reflection",
    description: "Daily and weekly reflection, and a letter to yourself to return to.",
    sections: ["daily", "weekly", "commitment"],
    settings: ["questions"],
    onboarding: [],
    offline: ["/profile/questions"],
  },
  {
    key: "expressions",
    label: "Expressions",
    description: "Moments worth keeping, and the people and things in them.",
    sections: ["expressions", "people"],
    settings: [],
    onboarding: [],
    offline: [],
  },
] as const satisfies readonly BundleDef[];

export type BundleKey = (typeof BUNDLES)[number]["key"];
export const BUNDLE_KEYS = BUNDLES.map((b) => b.key) as BundleKey[];

export function isBundleKey(v: string): v is BundleKey {
  return (BUNDLE_KEYS as string[]).includes(v);
}

export function bundleByKey(key: BundleKey): BundleDef {
  return BUNDLES.find((b) => b.key === key)!;
}

/** The bundle a section belongs to (none for Home and Insights). */
export function bundleOf(section: SectionKey): BundleDef | undefined {
  return BUNDLES.find((b) => (b.sections as readonly SectionKey[]).includes(section));
}

/** Every section of these bundles, in registry order. */
export function sectionsOf(bundles: readonly BundleKey[]): SectionKey[] {
  return BUNDLES.filter((b) => bundles.includes(b.key)).flatMap((b) => [...b.sections]);
}

/** The settings these bundles bring. */
export function settingsOf(bundles: readonly BundleKey[]): BundleSetting[] {
  return BUNDLES.filter((b) => bundles.includes(b.key)).flatMap((b) => [...b.settings]);
}
