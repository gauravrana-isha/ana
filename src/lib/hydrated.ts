"use client";

import { useSyncExternalStore } from "react";

const noop = () => () => {};

/**
 * False on the server and during hydration, true afterwards. Lets a screen render its
 * skeleton on both sides first (so they match), then switch to cached data the browser
 * already has without a hydration mismatch.
 */
export function useHydrated() {
  return useSyncExternalStore(noop, () => true, () => false);
}
