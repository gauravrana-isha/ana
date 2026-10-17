"use client";

import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import type { Moment } from "./moment-types";
import { fetchAllMoments } from "./journal";
import { plainText } from "@/components/moments/RichText";

export type MomentFilters = { person?: string; kind?: string; q?: string; stamp?: string; sort?: "newest" | "oldest" };

const PAGE = 20;

/** Every moment, opened on the device (words are sealed, so search and filters run here). */
export function useAllMoments() {
  return useQuery({ queryKey: ["moments", "all"], queryFn: fetchAllMoments });
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
