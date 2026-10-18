"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { DayLogEntries, DayLogEntry, Practice } from "./types";
import type { Moment } from "./moment-types";
import type { Me } from "./me";
import type { PortraitDTO } from "./portrait";
import type { DailyReflection, Letter, MomentsCopy, WeeklyReflection } from "./journal";
import type { PersonSummary } from "@/components/people/People";

/*
 * Showing a change straight away, everywhere it appears, in one place. A save puts its result
 * (or, offline, what was saved) on screen here; it stays until the server's copy replaces it on
 * the next refresh. Screens and saves call these helpers instead of writing to the cache.
 */

let qc: QueryClient | null = null;

/** The app's query cache (the providers register it once). */
export function showChangesIn(client: QueryClient) {
  qc = client;
}

function set<T>(key: readonly unknown[], change: (old: T | undefined) => T | undefined) {
  qc?.setQueryData<T>(key, change);
}

const byName = (a: { name: string }, b: { name: string }) => a.name.localeCompare(b.name);

export const onScreen = {
  /** The practices list, changed. */
  practices(change: (list: Practice[]) => Practice[]) {
    set<Practice[]>(["practices"], (old) => change(Array.isArray(old) ? old : []));
  },

  /** One practice's entry for a day, in the week grid. */
  weekEntry(weekStart: string, date: string, practiceId: string, entry: DayLogEntry) {
    set<Record<string, DayLogEntries>>(["week", weekStart], (old) => ({ ...(old ?? {}), [date]: { ...(old?.[date] ?? {}), [practiceId]: entry } }));
  },

  /** Your own details (name, photo, questions, sections…). */
  me(change: Partial<Me>) {
    set<Me>(["me"], (old) => (old ? { ...old, ...change } : old));
  },

  /** Someone added or changed, in the people list (kept in name order). */
  person(p: PersonSummary) {
    set<PersonSummary[]>(["people"], (old = []) => [...old.filter((x) => x.id !== p.id), p].sort(byName));
  },

  /** Someone removed. */
  personGone(id: string) {
    set<PersonSummary[]>(["people"], (old) => old?.filter((x) => x.id !== id));
  },

  /** A moment saved: its own page and the list (newest first). */
  moment(m: Moment) {
    set<Moment>(["moments", "one", m.id], () => m);
    onScreen.moments((list) => [m, ...list.filter((x) => x.id !== m.id)]);
  },

  /** A moment's page, from the list, until its full copy arrives (opening it from a card). */
  momentPreview(m: Moment) {
    set<Moment>(["moments", "one", m.id], (old) => old ?? m);
  },

  /** The device's copy of every moment, changed (after saving or deleting one). */
  moments(change: (items: Moment[]) => Moment[]) {
    set<MomentsCopy>(["moments", "all"], (copy) => (copy ? { ...copy, items: change(copy.items) } : copy));
  },

  /** A portrait kept (newest first). */
  portrait(p: PortraitDTO) {
    set<PortraitDTO[]>(["portraits"], (old) => [p, ...(Array.isArray(old) ? old : [])]);
  },

  /** A new commitment letter: it becomes the current one, the old one moves to history. */
  letter(body: string, revisit: Letter["revisit"]) {
    const now = new Date().toISOString();
    set<{ current: Letter | null; due: boolean; history: Letter[] }>(["commitment"], (old) => ({
      current: { id: "pending", body, revisit, revisitedAt: now, createdAt: now, supersededAt: null },
      due: false,
      history: [...(old?.current ? [{ ...old.current, supersededAt: now }] : []), ...(old?.history ?? [])],
    }));
  },

  /** A day's reflection as saved. */
  daily(date: string, r: DailyReflection) {
    set<DailyReflection>(["daily", date], () => r);
  },

  /** A week's reflection as saved. */
  weekly(weekStart: string, r: WeeklyReflection) {
    set<WeeklyReflection>(["weekly", weekStart], () => r);
  },
};
