"use client";

import { createContext, useContext } from "react";
import { BUNDLE_KEYS, type BundleKey } from "@/lib/bundles";
import { useMe } from "@/lib/me";

/*
 * The bundles this person has. Home, Profile, Insights and the navigation are built from these.
 * The page may be the copy saved on this device (it opens at once), so the server's list on
 * it can be old: once their details have been fetched since this page opened, those win, so a
 * change on Access shows straight away (not after a cached copy of their details expires).
 */

const Ctx = createContext<readonly BundleKey[] | null>(null);

/** When this page opened: details fetched after this are the server's current word. */
const OPENED = Date.now();

export function BundlesProvider({ bundles, children }: { bundles: BundleKey[]; children: React.ReactNode }) {
  const { data: me, dataUpdatedAt } = useMe();
  const fresh = me && dataUpdatedAt >= OPENED && Array.isArray(me.bundles) ? me.bundles : bundles;
  return <Ctx.Provider value={fresh}>{children}</Ctx.Provider>;
}

/** The bundles this person has (all of them outside the app's pages, e.g. in tests of a part). */
export function useBundles(): readonly BundleKey[] {
  return useContext(Ctx) ?? BUNDLE_KEYS;
}
