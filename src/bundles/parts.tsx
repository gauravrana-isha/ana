"use client";

import type { BundleKey } from "@/lib/bundles";
import type { HomeCard } from "./kit";
import { sadhanaHome } from "./sadhana/home";
import { reflectionHome } from "./reflection/home";
import { expressionsHome } from "./expressions/home";

/*
 * Each bundle's parts of the screens everyone has, in one list. A new bundle adds its entry
 * here (TypeScript insists every bundle in lib/bundles has one).
 */
export const PARTS: Record<BundleKey, { home: HomeCard[] }> = {
  sadhana: { home: sadhanaHome },
  reflection: { home: reflectionHome },
  expressions: { home: expressionsHome },
};

/** The Home cards of these bundles, in Home's order. */
export function homeCardsOf(bundles: readonly BundleKey[]): HomeCard[] {
  return bundles.flatMap((b) => PARTS[b].home).sort((a, b) => a.order - b.order);
}
