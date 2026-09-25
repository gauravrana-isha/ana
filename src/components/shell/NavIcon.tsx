"use client";

import { FeatureBadge, FeatureGlyph, hasBadge } from "@/components/art/FeatureBadge";
import type { NavItem } from "./nav";

/**
 * Navigation icons drawn in the journal's own style. Inactive: a line drawing in the text
 * colour. Active ("fill"): the feature's coloured badge, like the reference journal.
 */
export function NavIcon({ k, size = 22, weight, className }: { k: NavItem["key"] | "search"; size?: number; weight?: "fill" | "regular"; className?: string }) {
  if (weight === "fill" && hasBadge(k)) return <FeatureBadge k={k} size={size + 6} className={className} />;
  return <FeatureGlyph k={k} size={size} className={className} />;
}
