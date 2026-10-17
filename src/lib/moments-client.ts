"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Moment } from "./moment-types";
import { syncMoments, type MomentsCopy } from "./journal";
import { plainText } from "@/components/moments/RichText";

export type MomentFilters = { person?: string; kind?: string; q?: string; stamp?: string; sort?: "newest" | "oldest" };

const PAGE = 20;

export const MOMENTS_KEY = ["moments", "all"] as const;

/**
 * Every moment, opened on the device (words are sealed, so search and filters run here). The
 * copy is kept (encrypted) on the device; each refresh fetches only what changed.
 */
export function useAllMoments() {
  const qc = useQueryClient();
  return useQuery({
    queryKey: MOMENTS_KEY,
    queryFn: () => syncMoments(qc.getQueryData<MomentsCopy>(MOMENTS_KEY)),
    select: (copy) => copy.items,
  });
}

/** Change the device's copy of the moments directly (after saving or deleting one). */
export function updateMomentsCopy(qc: ReturnType<typeof useQueryClient>, change: (items: Moment[]) => Moment[]) {
  qc.setQueryData<MomentsCopy>(MOMENTS_KEY, (copy) => (copy ? { ...copy, items: change(copy.items) } : copy));
}

export function filterMoments(all: Moment[], f: MomentFilters) {
  const q = f.q?.trim().toLowerCase();
  const list = all.filter(
    (m) =>
      (!f.person || m.people.some((p) => p.id === f.person)) &&
      (!f.kind || (f.kind === "writing" ? m.kind === "writing" || m.kind === "moment" : m.kind === f.kind)) &&
      (!f.stamp || m.stamps.includes(f.stamp)) &&
      (!q ||
        m.title.toLowerCase().includes(q) ||
        plainText(m.body).toLowerCase().includes(q) ||
        (m.place ?? "").toLowerCase().includes(q) ||
        m.people.some((p) => p.name.toLowerCase().includes(q)))
  );
  const dir = f.sort === "oldest" ? 1 : -1;
  return list.sort((a, b) => dir * (a.occurredAt.localeCompare(b.occurredAt) || a.createdAt.localeCompare(b.createdAt)));
}

/** Moments matching the filters, shown a page at a time (same shape as before: pages of items). */
export function useMoments(filters: MomentFilters = {}) {
  const all = useAllMoments();
  const key = JSON.stringify(filters);
  const [shown, setShown] = useState({ key, n: PAGE });
  const n = shown.key === key ? shown.n : PAGE;
  const matching = useMemo(() => filterMoments(all.data ?? [], JSON.parse(key) as MomentFilters), [all.data, key]);
  return {
    data: all.data ? { pages: [{ items: matching.slice(0, n) }] } : undefined,
    isPending: all.isPending,
    hasNextPage: matching.length > n,
    isFetchingNextPage: false,
    fetchNextPage: () => setShown({ key, n: n + PAGE }),
  };
}
