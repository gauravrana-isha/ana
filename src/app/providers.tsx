"use client";

import { IsRestoringProvider, QueryClient, QueryClientProvider } from "@tanstack/react-query";
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

export const QUERY_CACHE_KEY = "ana-query-cache";
const DAY = 24 * 60 * 60 * 1000;

// Things that are only useful live, or too personal to keep lying around.
const NOT_PERSISTED = new Set(["search", "admin-users"]);

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 30_000, // show cached data instantly, refresh after 30s
            gcTime: DAY, // keep it long enough to be persisted and reopened
            retry: 1,
            refetchOnWindowFocus: true,
          },
        },
      })
  );

  const [persister] = useState(() =>
    createAsyncStoragePersister({
      key: QUERY_CACHE_KEY,
      storage: {
        getItem: (k) => get<string>(k).then((v) => v ?? null),
        setItem: (k, v) => set(k, v),
        removeItem: (k) => del(k),
      },
      throttleTime: 1500,
    })
  );

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  const [persistOptions] = useState<Omit<PersistQueryClientOptions, "queryClient">>(() => ({
    persister,
    maxAge: 7 * DAY,
    // Bump when a cached response changes shape, so old copies are dropped once.
    buster: "v3",
    dehydrateOptions: {
      shouldDehydrateQuery: (q) => q.state.status === "success" && !NOT_PERSISTED.has(String(q.queryKey[0])),
    },
  }));

  return (
    <QueryClientProvider client={queryClient}>
      <RestoreAfterHydration client={queryClient} options={persistOptions}>
        <ToastProvider>
          <ThemeColor />
          <ConnectivityIndicator />
          {children}
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
