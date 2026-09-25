"use client";

import { useEffect } from "react";

/** Checks quietly for approval and opens the app the moment it lands. */
export function PendingWatcher() {
  useEffect(() => {
    let stopped = false;
    async function check() {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch("/api/me", { cache: "no-store" });
        const me = await res.json();
        if (!stopped && me?.status === "APPROVED") window.location.replace("/");
      } catch {
        /* offline: try again next tick */
      }
    }
    const id = window.setInterval(check, 20_000);
    document.addEventListener("visibilitychange", check);
    return () => {
      stopped = true;
      window.clearInterval(id);
      document.removeEventListener("visibilitychange", check);
    };
  }, []);
  return null;
}
