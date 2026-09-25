"use client";

import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { del } from "idb-keyval";

const KEY = "ana:uid";

/**
 * The cache is per device. If someone else signs in here (without signing the previous
 * person out), drop everything cached before showing their data.
 */
export function CacheGuard({ userId }: { userId: string }) {
  const qc = useQueryClient();
  useEffect(() => {
    let previous: string | null = null;
    try {
      previous = localStorage.getItem(KEY);
      localStorage.setItem(KEY, userId);
    } catch {
      return;
    }
    if (previous && previous !== userId) {
      qc.clear();
      del("ana-query-cache").catch(() => {});
    }
  }, [qc, userId]);
  return null;
}
