"use client";

import { useSyncExternalStore } from "react";

/** Whether this device is online right now (re-renders when it changes). */
export function useOnline() {
  return useSyncExternalStore(subscribe, () => navigator.onLine, () => true);
}

function subscribe(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
