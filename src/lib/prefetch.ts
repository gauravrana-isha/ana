"use client";

import { useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { today as todayStr, weekStart } from "./dates";
import { keys } from "./queries";

/*
 * Start loading a screen's data the moment someone reaches for it (hover, focus, first
 * touch of a menu item), in parallel with the page itself, so the screen doesn't arrive
 * empty and only then ask for its data. Keys and response shapes match the screens'
 * own queries exactly, so what's fetched here is what they render.
 */

const json = (url: string) => async () => {
  const res = await fetch(url);
  return res.json();
};
const jsonOr = <T,>(url: string, fallback: T) => async () => {
  const res = await fetch(url);
  return res.ok ? res.json() : fallback;
};

function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem("ana:" + key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Fresh enough to skip: anything fetched this recently isn't fetched again. */
const FRESH = 30_000;

type Planned = { key: readonly unknown[]; fn: () => Promise<unknown>; infinite?: boolean; fresh?: number };

function plan(href: string): Planned[] {
  const date = todayStr();
  const week = weekStart(date);
  const me = { key: ["me"], fn: json("/api/me"), fresh: 60_000 };
  const practices = { key: keys.practices(), fn: jsonOr("/api/practices", []) };
  const day = {
    key: keys.day(date),
    fn: async () => {
      const res = await fetch(`/api/days/${date}`);
      if (!res.ok) return { date, entries: {} };
      const data = await res.json();
      return { date: data.date ?? date, entries: data.entries ?? {} };
    },
  };
  const quote = { key: keys.quote(date), fn: json(`/api/quote?date=${date}`), fresh: 60 * 60_000 };

  if (href.startsWith("/today")) return [me, { key: ["today", date], fn: json(`/api/today?date=${date}`) }, quote, practices, day];
  if (href.startsWith("/tracker")) {
    // The week grid is only fetched in week view, so only prefetch it there.
    const weekly = stored("tracker.view", "daily") === "weekly";
    return [practices, day, quote, ...(weekly ? [{ key: ["week", week], fn: json(`/api/days/week/${week}`) }] : [])];
  }
  if (href.startsWith("/daily")) return [{ key: ["daily", date], fn: json(`/api/daily/${date}`) }, quote];
  if (href.startsWith("/weekly")) {
    const review = stored("weekly.tab", "reflection") === "digest";
    return review
      ? [{ key: ["week-review", week], fn: json(`/api/digest/${week}?today=${date}`) }]
      : [{ key: ["weekly", week], fn: json(`/api/weekly/${week}`) }];
  }
  if (href.startsWith("/expressions")) {
    // Same filters the page starts with (its remembered kind and sort, no search).
    const filters = { kind: stored("moments.filter", ""), q: "", person: "", stamp: "", sort: stored("moments.sort", "newest") };
    const sp = new URLSearchParams();
    if (filters.kind) sp.set("kind", filters.kind);
    if (filters.sort === "oldest") sp.set("sort", "oldest");
    return [{ key: ["moments", filters], fn: jsonOr(`/api/expressions?${sp}`, { items: [], hasMore: false, nextCursor: null }), infinite: true }];
  }
  if (href.startsWith("/people")) return [{ key: ["people"], fn: jsonOr("/api/people", []) }];
  if (href.startsWith("/insights")) return [{ key: ["insights", date], fn: json(`/api/insights?date=${date}`) }];
  if (href.startsWith("/commitment")) return [{ key: ["commitment"], fn: json("/api/commitment") }];
  if (href.startsWith("/profile/who")) return [me, { key: ["portraits"], fn: jsonOr("/api/portraits", []) }];
  if (href.startsWith("/profile")) return [me, practices, { key: ["portraits"], fn: jsonOr("/api/portraits", []) }, { key: ["profile-stats", date], fn: json(`/api/profile?date=${date}`) }];
  if (href.startsWith("/admin")) return [{ key: ["admin-users"], fn: json("/api/admin/users") }];
  return [];
}

export function prefetchScreen(qc: QueryClient, href: string) {
  for (const q of plan(href)) {
    if (q.infinite) {
      qc.prefetchInfiniteQuery({ queryKey: q.key, queryFn: q.fn, initialPageParam: null, staleTime: q.fresh ?? FRESH }).catch(() => {});
    } else {
      qc.prefetchQuery({ queryKey: q.key, queryFn: q.fn, staleTime: q.fresh ?? FRESH }).catch(() => {});
    }
  }
}

/** Handlers for a menu link: hover or focus on desktop, first touch on phones. */
export function usePrefetchScreen() {
  const qc = useQueryClient();
  return useCallback(
    (href: string) => {
      const go = () => prefetchScreen(qc, href);
      return { onPointerEnter: go, onFocus: go, onTouchStart: go };
    },
    [qc]
  );
}
