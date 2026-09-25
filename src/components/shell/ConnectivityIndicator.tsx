"use client";

import { useState, useEffect, useSyncExternalStore } from "react";
import { WifiSlash, ArrowsClockwise } from "@phosphor-icons/react";
import { getQueueSize } from "@/lib/offlineQueue";

export function ConnectivityIndicator() {
  const online = useSyncExternalStore(subscribeOnline, () => navigator.onLine, () => true);
  const [queueSize, setQueueSize] = useState(0);

  useEffect(() => {
    // Check queue size periodically
    const interval = setInterval(async () => {
      const size = await getQueueSize();
      setQueueSize(size);
    }, 5000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  if (online && queueSize === 0) return null;

  return (
    <div className="fixed top-2 left-1/2 -translate-x-1/2 z-50 flex items-center gap-2 px-3 py-1.5 rounded-full bg-surface border border-line shadow-lg">
      {!online && (
        <>
          <WifiSlash size={14} weight="thin" className="text-accent" />
          <span className="font-ui text-[11px] text-ink-soft">Offline</span>
        </>
      )}
      {online && queueSize > 0 && (
        <>
          <ArrowsClockwise size={14} weight="thin" className="text-accent animate-spin" />
          <span className="font-ui text-[11px] text-ink-soft">Syncing {queueSize}</span>
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
