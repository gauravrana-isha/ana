"use client";

import { useCallback } from "react";
import { useQueryClient, type QueryClient } from "@tanstack/react-query";
import { today as todayStr, weekStart } from "./dates";
import { keys } from "./queries";
import { isUnlocked, openDeep } from "./vault/vault";
import {
  syncMoments,
  fetchCommitment,
  fetchDaily,
  fetchDay,
  fetchDigest,
  fetchInsights,
  fetchPeople,
  fetchPortraits,
  fetchPractices,
  fetchProfileStats,
  fetchToday,
  fetchWeek,
  fetchWeekly,
} from "./journal";

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
function stored(key: string, fallback: string) {
  try {
    return localStorage.getItem("ana:" + key) ?? fallback;
  } catch {
    return fallback;
  }
}

/** Fresh enough to skip: anything fetched this recently isn't fetched again. */
const FRESH = 30_000;

type Planned = { key: readonly unknown[]; fn: () => Promise<unknown>; fresh?: number };

function plan(qc: QueryClient, href: string): Planned[] {
  // Nothing personal can be fetched (or opened) while the journal is locked on this device.
  if (!isUnlocked()) return [];
  const date = todayStr();
  const week = weekStart(date);
  const me = { key: ["me"], fn: async () => openDeep(await json("/api/me")()), fresh: 60_000 };
  const practices = { key: keys.practices(), fn: fetchPractices };
  const day = { key: keys.day(date), fn: () => fetchDay(date) };
  const quote = { key: keys.quote(date), fn: json(`/api/quote?date=${date}`), fresh: 60 * 60_000 };

  if (href.startsWith("/home")) return [me, { key: ["today", date], fn: () => fetchToday(date) }, quote, practices, day];
  if (href.startsWith("/sadhana")) {
    // The week grid is only fetched in week view, so only prefetch it there.
    const weekly = stored("tracker.view", "daily") === "weekly";
    return [practices, day, quote, ...(weekly ? [{ key: ["week", week], fn: () => fetchWeek(week) }] : [])];
  }
  if (href.startsWith("/daily")) return [{ key: ["daily", date], fn: () => fetchDaily(date) }, quote];
  if (href.startsWith("/weekly")) {
    const review = stored("weekly.tab", "reflection") === "digest";
    return review
      ? [{ key: ["week-review", week], fn: () => fetchDigest(week, date) }]
      : [{ key: ["weekly", week], fn: () => fetchWeekly(week) }];
  }
  if (href.startsWith("/moments")) return [{ key: ["moments", "all"], fn: () => syncMoments(qc.getQueryData(["moments", "all"])) }];
  if (href.startsWith("/presence")) return [{ key: ["people"], fn: () => fetchPeople() }];
  if (href.startsWith("/insights")) return [{ key: ["insights", date], fn: () => fetchInsights(date) }];
  if (href.startsWith("/sankalpa")) return [{ key: ["commitment"], fn: fetchCommitment }];
  if (href.startsWith("/profile/who")) return [me, { key: ["portraits"], fn: () => fetchPortraits() }];
  if (href.startsWith("/profile")) return [me, practices, { key: ["portraits"], fn: () => fetchPortraits() }, { key: ["profile-stats", date], fn: () => fetchProfileStats(date) }];
  if (href.startsWith("/admin")) return [{ key: ["admin-users"], fn: json("/api/admin/users") }];
  return [];
}

export function prefetchScreen(qc: QueryClient, href: string) {
  for (const q of plan(qc, href)) {
    qc.prefetchQuery({ queryKey: q.key, queryFn: q.fn, staleTime: q.fresh ?? FRESH }).catch(() => {});
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
