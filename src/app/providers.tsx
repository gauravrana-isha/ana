"use client";

import { IsRestoringProvider, onlineManager, QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { showChangesIn } from "@/lib/on-screen";
import { SW_URL } from "@/lib/push-client";
import {
  persistQueryClientRestore,
  persistQueryClientSubscribe,
  type PersistQueryClientOptions,
} from "@tanstack/query-persist-client-core";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { useEffect, useRef, useState } from "react";
import { ConnectivityIndicator } from "@/components/shell/ConnectivityIndicator";
import { ThemeColor } from "@/components/shell/ThemeColor";
import { ToastProvider } from "@/components/ui/Toast";
import { reportError } from "@/lib/report";
import { isSealed } from "@/lib/vault/crypto";
import { isUnlocked, openDeep, seal, waitForUnlock } from "@/lib/vault/vault";
import { ConfirmProvider } from "@/components/ui/Confirm";

export const QUERY_CACHE_KEY = "ana-query-cache";
const DAY = 24 * 60 * 60 * 1000;

// Things that are only useful live, or too personal to keep lying around.
const NOT_PERSISTED = new Set(["search", "search-index", "admin-users", "vault-status"]);

/** A copy was kept on the device but this page couldn't read it (still locked): leave it be. */
let unreadCopy = false;

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => {
    const client = new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // show cached data instantly, refresh after 30s
            // Kept as long as the copy on the device lasts (7 days), so every screen opens offline.
            gcTime: 7 * DAY,
            retry: 1,
            refetchOnWindowFocus: true,
          },
          // Saves always run: offline, they go into the outbox (kept on the device) instead of
          // waiting in memory, where a reload would lose them.
          mutations: { networkMode: "always" },
        },
      });
    // Saves update what's on screen straight away (and offline, until they're sent).
    showChangesIn(client);
    // Start from the real connection state: TanStack assumes online until the browser says
    // otherwise, so a page opened offline would try the server and show empty screens instead
    // of what's kept on the device.
    if (typeof navigator !== "undefined") onlineManager.setOnline(navigator.onLine);
    return client;
  });

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: QUERY_CACHE_KEY,
      // The copy on this device is encrypted with the journal key, like everything on the
      // server: it's opened once the device is unlocked, and only written while it is.
      storage: {
        getItem: async (k) => {
          const stored = await get<string>(k).catch(() => undefined);
          if (!stored) return null;
          if (!isSealed(stored)) {
            await del(k).catch(() => {}); // an older plain copy: dropped
            return null;
          }
          // Unlocking from this device's own key is quick, but give it time on a slow phone.
          if (!(await waitForUnlock(20_000))) {
            unreadCopy = true;
            return null;
          }
          return openDeep(stored).catch(() => null);
        },
        setItem: async (k, v) => {
          // Never write over a kept copy this page couldn't read back (it stayed locked): it
          // would be replaced by a nearly empty one.
          if (isUnlocked() && !unreadCopy) await set(k, await seal(v));
        },
        removeItem: (k) => del(k),
      },
      throttleTime: 1500,
    })
  );

  // Errors nothing else caught: reported to the admins (technical details only).
  useEffect(() => {
    const onError = (e: ErrorEvent) => reportError("app", e.error ?? e.message);
    const onRejection = (e: PromiseRejectionEvent) => reportError("app-promise", e.reason);
    window.addEventListener("error", onError);
    window.addEventListener("unhandledrejection", onRejection);
    return () => {
      window.removeEventListener("error", onError);
      window.removeEventListener("unhandledrejection", onRejection);
    };
  }, []);

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register(SW_URL, { scope: "/" }).catch(console.error);
    }
  }, []);

  const [persistOptions] = useState<Omit<PersistQueryClientOptions, "queryClient">>(() => ({
    persister,
    maxAge: 7 * DAY,
    // Bump when a cached response changes shape, so old copies are dropped once.
    buster: "v4",
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => q.state.status === "success" && !NOT_PERSISTED.has(String(q.queryKey[0])),
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <RestoreAfterHydration client={queryClient} options={persistOptions}>
        <ToastProvider>
          <ConfirmProvider>
            <ThemeColor />
            <ConnectivityIndicator />
            {children}
          </ConfirmProvider>
        </ToastProvider>
      </RestoreAfterHydration>
    </QueryClientProvider>
  );
}

/**
 * TanStack's PersistQueryClientProvider, with one difference: the saved cache is restored
 * once the page has finished hydrating, not as soon as the shell mounts. Each section's
 * loading boundary hydrates on its own, and restoring in between let a later part render
 * with data the server never had (a hydration mismatch). Until the restore finishes,
 * queries stay pending and don't fetch, exactly as with the stock provider.
 */
function RestoreAfterHydration({
  client,
  options,
  children,
}: {
  client: QueryClient;
  options: Omit<PersistQueryClientOptions, "queryClient">;
  children: React.ReactNode;
}) {
  const [isRestoring, setIsRestoring] = useState(true);
  const started = useRef(false);

  useEffect(() => {
    const full = { ...options, queryClient: client };
    if (!isRestoring) return persistQueryClientSubscribe(full);
    if (started.current) return;
    started.current = true;
    // Let React finish hydrating every boundary first: idle time, or a short timeout at most.
    const begin = () => {
      persistQueryClientRestore(full)
        .catch(() => {})
        .finally(() => setIsRestoring(false));
    };
    if (typeof window.requestIdleCallback === "function") window.requestIdleCallback(begin, { timeout: 300 });
    else setTimeout(begin, 50);
  }, [client, options, isRestoring]);

  return <IsRestoringProvider value={isRestoring}>{children}</IsRestoringProvider>;
}
