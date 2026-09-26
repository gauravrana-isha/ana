"use client";

import { useInfiniteQuery } from "@tanstack/react-query";
import type { Moment } from "./moment-types";

export function useMoments(filters: { person?: string; kind?: string; q?: string; stamp?: string; sort?: "newest" | "oldest" } = {}) {
  return useInfiniteQuery({
    queryKey: ["moments", filters],
    initialPageParam: null as string | null,
    queryFn: async ({ pageParam }) => {
      const sp = new URLSearchParams();
      if (filters.person) sp.set("person", filters.person);
      if (filters.kind) sp.set("kind", filters.kind);
      if (filters.q) sp.set("q", filters.q);
      if (filters.stamp) sp.set("stamp", filters.stamp);
      if (filters.sort === "oldest") sp.set("sort", "oldest");
      if (pageParam) sp.set("cursor", pageParam);
      const res = await fetch(`/api/expressions?${sp}`);
      if (!res.ok) return { items: [] as Moment[], hasMore: false, nextCursor: null };
      return (await res.json()) as { items: Moment[]; hasMore: boolean; nextCursor: string | null };
    },
    getNextPageParam: (last) => (last.hasMore ? last.nextCursor : null),
  });
}
