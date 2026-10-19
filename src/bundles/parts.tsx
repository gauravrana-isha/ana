"use client";

import type { BundleKey, BundleSetting } from "@/lib/bundles";
import type { HomeCard, MonthFigure, SettingPart } from "./kit";
import { sadhanaHome } from "./sadhana/home";
import { sadhanaMonth, sadhanaSettings } from "./sadhana/profile";
import { reflectionHome } from "./reflection/home";
import { reflectionMonth, reflectionSettings } from "./reflection/profile";
import { expressionsHome } from "./expressions/home";
import { expressionsMonth } from "./expressions/profile";

/*
 * Each bundle's parts of the screens everyone has, in one list. A new bundle adds its entry
 * here (TypeScript insists every bundle in lib/bundles has one).
 */
export const PARTS: Record<BundleKey, { home: HomeCard[]; settings: SettingPart[]; month: MonthFigure[] }> = {
  sadhana: { home: sadhanaHome, settings: sadhanaSettings, month: sadhanaMonth },
  reflection: { home: reflectionHome, settings: reflectionSettings, month: reflectionMonth },
  expressions: { home: expressionsHome, settings: [], month: expressionsMonth },
};

/** The Home cards of these bundles, in Home's order. */
export function homeCardsOf(bundles: readonly BundleKey[]): HomeCard[] {
  return bundles.flatMap((b) => PARTS[b].home).sort((a, b) => a.order - b.order);
}

/** The Profile settings these bundles bring. */
export function settingPartsOf(bundles: readonly BundleKey[]): SettingPart[] {
  return bundles.flatMap((b) => PARTS[b].settings);
}

/** A bundle's setting, by its key (for its page, /profile/<key>). */
export function settingPart(key: string): SettingPart | undefined {
  return Object.values(PARTS)
    .flatMap((p) => p.settings)
    .find((x) => x.key === (key as BundleSetting));
}

/** The "This month" figures these bundles bring. */
export function monthFiguresOf(bundles: readonly BundleKey[]): MonthFigure[] {
  return bundles.flatMap((b) => PARTS[b].month);
}
