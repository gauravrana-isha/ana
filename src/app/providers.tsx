"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { ConnectivityIndicator } from "@/components/shell/ConnectivityIndicator";
import { ThemeColor } from "@/components/shell/ThemeColor";
import { ToastProvider } from "@/components/ui/Toast";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(
    () =>
      new QueryClient({
        defaultOptions: {
          queries: {
            staleTime: 5_000, // 5 seconds — data refreshes faster
            retry: 1,
          },
        },
      })
  );

  // Register service worker
  useEffect(() => {
    if ("serviceWorker" in navigator && process.env.NODE_ENV === "production") {
      navigator.serviceWorker.register("/sw.js").catch(console.error);
    }
  }, []);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ThemeColor />
        <ConnectivityIndicator />
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}
