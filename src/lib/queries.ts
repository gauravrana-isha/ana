"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DayLogEntries } from "./types";
import { fetchDay, fetchPractices, saveDay } from "./journal";
import { openDeep } from "./vault/vault";

// === Query Keys ===
export const keys = {
  day: (date: string) => ["day", date] as const,
  daily: (date: string) => ["daily", date] as const,
  weekly: (weekStart: string) => ["weekly", weekStart] as const,
  expressions: () => ["expressions"] as const,
  practices: () => ["practices"] as const,
  quote: (date: string) => ["quote", date] as const,
};

// === Practices ===
export function usePractices() {
  return useQuery({ queryKey: keys.practices(), queryFn: fetchPractices });
}

// === DayLog ===
export function useDayLog(date: string) {
  return useQuery({ queryKey: keys.day(date), queryFn: () => fetchDay(date) });
}

/** Save ticks and values; the screen updates at once, and offline saves wait in the outbox. */
export function useUpdateDayLog(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationKey: ["day-save", date],
    mutationFn: async (entries: DayLogEntries) => {
      const res = await saveDay(date, entries);
      return res.queued ? undefined : { entries: await openDeep((res.data?.entries ?? {}) as DayLogEntries) };
    },
    onMutate: async (newEntries) => {
      await qc.cancelQueries({ queryKey: keys.day(date) });
      const prev = qc.getQueryData(keys.day(date));
      qc.setQueryData(keys.day(date), (old: { date: string; entries: DayLogEntries } | undefined) => ({
        date,
        entries: { ...(old?.entries ?? {}), ...newEntries },
      }));
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) qc.setQueryData(keys.day(date), ctx.prev);
    },
    onSuccess: (saved) => {
      // The reply is the whole saved day: show it directly instead of asking again. If more
      // ticks are still on their way, the last one to land fills it in.
      if (saved?.entries && qc.isMutating({ mutationKey: ["day-save", date] }) <= 1) {
        qc.setQueryData(keys.day(date), { date, entries: saved.entries });
      }
    },
    onSettled: (saved, err) => {
      if (err) qc.invalidateQueries({ queryKey: keys.day(date) });
      // The week grid and review are refreshed only if they're on screen (otherwise just marked stale).
      qc.invalidateQueries({ queryKey: ["week"] });
      qc.invalidateQueries({ queryKey: ["week-review"] });
    },
  });
}

// === Quote ===
type Quote = { quote: string; source: string; today?: boolean };

export function useQuote(date: string) {
  const qc = useQueryClient();
  return useQuery({
    queryKey: keys.quote(date),
    // A new day's quote is fetched: until it's here, the latest one kept (yesterday's) holds its
    // place, so Home doesn't jump when it arrives.
    placeholderData: () =>
      qc
        .getQueriesData<Quote>({ queryKey: ["quote"] })
        .filter(([key, data]) => String(key[1]) < date && data?.quote)
        .sort(([a], [b]) => String(b[1]).localeCompare(String(a[1])))[0]?.[1],
    queryFn: async () => {
      const res = await fetch(`/api/quote?date=${date}`);
      if (!res.ok) return { quote: "", source: "fallback", today: false };
      return res.json() as Promise<Quote>;
    },
    // Today's quote holds for the day; until it's out (before ~07:31 IST), check again soon.
    staleTime: (q) => (q.state.data?.today ? 6 * 60 * 60 * 1000 : 4 * 60 * 1000),
  });
}
