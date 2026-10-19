"use client";

import { createContext, useContext } from "react";
import { BUNDLE_KEYS, type BundleKey } from "@/lib/bundles";

/*
 * The bundles this person has, as the server knows them on this page load. Home, Profile,
 * Insights and the navigation are built from these, so a change on Access shows on the next
 * page load (not after a cached copy of their details expires).
 */

const Ctx = createContext<readonly BundleKey[] | null>(null);

export function BundlesProvider({ bundles, children }: { bundles: BundleKey[]; children: React.ReactNode }) {
  return <Ctx.Provider value={bundles}>{children}</Ctx.Provider>;
}

/** The bundles this person has (all of them outside the app's pages, e.g. in tests of a part). */
export function useBundles(): readonly BundleKey[] {
  return useContext(Ctx) ?? BUNDLE_KEYS;
}
