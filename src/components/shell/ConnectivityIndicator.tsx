"use client";

import { useSyncExternalStore } from "react";

import { usePendingCount } from "@/lib/outbox";
import { Glyph } from "@/components/art/Glyphs";

/** A small pill at the top while offline, or while saves made offline are still being sent. */
export function ConnectivityIndicator() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const pending = usePendingCount();

  if (online && pending === 0) return null;

  return (
    <div
      role="status"
      className="fixed top-[max(8px,var(--safe-top))] left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 h-8 px-3.5 rounded-full bg-surface border border-line shadow-[var(--shadow-lift)]"
    >
      {!online ? (
        <>
          <Glyph k="offline" size={16} className="text-accent" />
          <span className="font-ui text-[12px] text-ink-soft">
            Offline{pending ? ` · ${pending} ${pending === 1 ? "save" : "saves"} waiting` : " · saves will wait"}
          </span>
        </>
      ) : (
        <>
          <Glyph k="sync" size={16} className="text-accent animate-spin" />
          <span className="font-ui text-[12px] text-ink-soft">Saving {pending}…</span>
        </>
      )}
    </div>
  );
}

function subscribeOnline(cb: () => void) {
  window.addEventListener("online", cb);
  window.addEventListener("offline", cb);
  return () => {
    window.removeEventListener("online", cb);
    window.removeEventListener("offline", cb);
  };
}
