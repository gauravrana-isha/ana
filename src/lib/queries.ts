"use client";

import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import type { DayLogEntries, Practice } from "./types";

// === Query Keys ===
export const keys = {
  day: (date: string) => ["day", date] as const,
  daily: (date: string) => ["daily", date] as const,
  weekly: (weekStart: string) => ["weekly", weekStart] as const,
  expressions: () => ["expressions"] as const,
  practices: () => ["practices"] as const,
  seva: () => ["seva"] as const,
  quote: (date: string) => ["quote", date] as const,
};

// === Practices ===
export function usePractices() {
  return useQuery({
    queryKey: keys.practices(),
    queryFn: async (): Promise<Practice[]> => {
      const res = await fetch("/api/practices");
      if (!res.ok) return [];
      const data = await res.json();
      return Array.isArray(data) ? data : [];
    },
  });
}

// === DayLog ===
export function useDayLog(date: string) {
  return useQuery({
    queryKey: keys.day(date),
    queryFn: async () => {
      const res = await fetch(`/api/days/${date}`);
      if (!res.ok) return { date, entries: {} as DayLogEntries };
      const data = await res.json();
      return { date: data.date ?? date, entries: (data.entries ?? {}) as DayLogEntries };
    },
  });
}

export function useUpdateDayLog(date: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (entries: DayLogEntries) => {
      try {
        const res = await fetch(`/api/days/${date}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ entries }),
        });
        if (!res.ok) throw new Error("Failed to update day log");
        return res.json();
      } catch (err) {
        // Offline — queue for later
        if (!navigator.onLine) {
          const { enqueue } = await import("./offlineQueue");
          await enqueue({
            url: `/api/days/${date}`,
            method: "PATCH",
            body: JSON.stringify({ entries }),
          });
          return { queued: true };
        }
        throw err;
      }
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
    onSettled: () => {
      qc.invalidateQueries({ queryKey: keys.day(date) });
      // Also invalidate week view so it picks up changes
      qc.invalidateQueries({ queryKey: ["week"] });
      qc.invalidateQueries({ queryKey: ["digest"] });
    },
  });
}

// === Quote ===
export function useQuote(date: string) {
  return useQuery({
    queryKey: keys.quote(date),
    queryFn: async () => {
      const res = await fetch(`/api/quote?date=${date}`);
      if (!res.ok) return { quote: "", source: "fallback" };
      return res.json() as Promise<{ quote: string; source: string }>;
    },
    staleTime: 60 * 60 * 1000, // 1 hour - same quote all day
  });
}
