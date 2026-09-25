"use client";

import { useCallback, useSyncExternalStore } from "react";

/*
 * Small UI choices (a tab, a filter, a view) remembered on this device. Read through
 * useSyncExternalStore so server and first client render agree, then the saved value lands.
 * Storage can be blocked (private mode); every access is guarded.
 */
const PREFIX = "ana:";
const listeners = new Set<() => void>();

function read(key: string): string | null {
  try {
    return localStorage.getItem(PREFIX + key);
  } catch {
    return null;
  }
}

function subscribe(cb: () => void) {
  listeners.add(cb);
  const onStorage = (e: StorageEvent) => e.key?.startsWith(PREFIX) && cb();
  window.addEventListener("storage", onStorage);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", onStorage);
  };
}

export function usePersistentState<T extends string>(key: string, initial: T, allowed?: readonly T[]) {
  const raw = useSyncExternalStore(subscribe, () => read(key), () => null);
  const value = raw !== null && (!allowed || allowed.includes(raw as T)) ? (raw as T) : initial;
  const set = useCallback(
    (next: T) => {
      try {
        localStorage.setItem(PREFIX + key, next);
      } catch {
        /* not persisted; fine */
      }
      listeners.forEach((l) => l());
    },
    [key]
  );
  return [value, set] as const;
}
