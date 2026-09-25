"use client";

import { QueryClient } from "@tanstack/react-query";
import { PersistQueryClientProvider } from "@tanstack/react-query-persist-client";
import { createAsyncStoragePersister } from "@tanstack/query-async-storage-persister";
import { del, get, set } from "idb-keyval";
import { useEffect, useState } from "react";
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

  return (
    <PersistQueryClientProvider
      client={queryClient}
      persistOptions={{
        persister,
        maxAge: 7 * DAY,
        // Bump when a cached response changes shape, so old copies are dropped once.
        buster: "v3",
        dehydrateOptions: {
          shouldDehydrateQuery: (q) => q.state.status === "success" && !NOT_PERSISTED.has(String(q.queryKey[0])),
        },
      }}
    >
      <ToastProvider>
        <ThemeColor />
        <ConnectivityIndicator />
        {children}
      </ToastProvider>
    </PersistQueryClientProvider>
  );
}
