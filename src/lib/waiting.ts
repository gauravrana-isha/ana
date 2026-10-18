"use client";

import { useMemo, useSyncExternalStore } from "react";
import { flush, removeSave, retrySave, usePendingSaves, type Pending } from "./outbox";
import { dropPendingMedia, retryMedia, useWaitingFiles, type WaitingFile } from "./media-outbox";

/*
 * Everything kept on this phone that hasn't reached the journal yet, in words: the saves in the
 * outbox and the files waiting to go up, with the server's refusals kept beside them. One
 * place for the marks on each item, the list of what's waiting, the quiet dot and signing out.
 * (Saves are sealed, so they're described by what they are, never by what they say.)
 */

export type WaitingKind = "moment" | "person" | "practice" | "tick" | "reflection" | "weekly" | "letter" | "portrait" | "profile" | "photo" | "voice" | "video" | "change";

export interface WaitingItem {
  /** The save's or file's own id. */
  key: string;
  kind: WaitingKind;
  /** What it is, e.g. "A new moment", "Practice ticks · 18 Oct". */
  label: string;
  /** How many things it carries (a day's save can carry several ticks). */
  count: number;
  bytes: number;
  file: boolean;
  /** Why the server turned it down, when it did. */
  refused?: string;
  /** What it marks on screen as not yet sent (a moment's id, `day:<date>:<practice>`…). */
  marks: string[];
}

const day = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString(undefined, { day: "numeric", month: "short" });

function parseBody(p: Pending): Record<string, unknown> {
  try {
    return (p.body ? JSON.parse(p.body) : {}) ?? {};
  } catch {
    return {};
  }
}

/** A save, in words. */
export function describeSave(p: Pending): WaitingItem {
  const [, , area, rest] = p.url.split("?")[0].split("/"); // "", "api", area, id/date
  const body = parseBody(p);
  const base = { key: p.id, count: 1, bytes: (p.body?.length ?? 0) + 200, file: false, refused: p.refused ? refusedWords(p.refused.status) : undefined };
  const verb = (thing: string) => (p.method === "DELETE" ? `${thing} removed` : p.method === "POST" ? `A new ${thing.replace(/^an? /i, "")}` : `Changes to ${thing.toLowerCase()}`);
  const id = rest ?? (typeof body.id === "string" ? body.id : undefined);
  switch (area) {
    case "expressions":
      return { ...base, kind: "moment", label: verb("A moment"), marks: id ? [id] : [] };
    case "people":
      return { ...base, kind: "person", label: verb("A person"), marks: id ? [id] : [] };
    case "practices":
      if (body.reorder) return { ...base, kind: "practice", label: "Practices reordered", marks: [] };
      return { ...base, kind: "practice", label: verb("A practice"), marks: id ? [id] : [] };
    case "days": {
      const ids = Object.keys((body.entries as object) ?? {});
      return { ...base, kind: "tick", count: Math.max(ids.length, 1), label: `Practice ${ids.length === 1 ? "tick" : "ticks"} · ${day(rest)}`, marks: ids.map((pid) => `day:${rest}:${pid}`) };
    }
    case "daily":
      return { ...base, kind: "reflection", label: `Reflection · ${day(rest)}`, marks: [`daily:${rest}`] };
    case "weekly":
      return { ...base, kind: "weekly", label: `Weekly reflection · week of ${day(rest)}`, marks: [`weekly:${rest}`] };
    case "commitment":
      return { ...base, kind: "letter", label: "Your commitment letter", marks: ["letter"] };
    case "portraits":
      return { ...base, kind: "portrait", label: "A portrait", marks: id ? [`portrait:${id}`] : [] };
    case "me":
      return { ...base, kind: "profile", label: body.questions ? "Your questions" : "Your profile", marks: ["me"] };
    case "attachments":
      return { ...base, kind: "change", label: "A file removed", marks: [] };
    default:
      return { ...base, kind: "change", label: "A change", marks: [] };
  }
}

const FILE_KIND = { photo: "photo", audio: "voice", video: "video" } as const;
const FILE_LABEL = { photo: "A photo", voice: "A voice note", video: "A video" } as const;

/** A file, in words. */
export function describeFile(f: WaitingFile): WaitingItem {
  const kind = FILE_KIND[f.kind as keyof typeof FILE_KIND] ?? "photo";
  return { key: f.id, kind, label: FILE_LABEL[kind], count: 1, bytes: f.bytes, file: true, refused: f.refused ? "Couldn't be kept (too large for the space left?)" : undefined, marks: [f.id] };
}

function refusedWords(status: number) {
  if (status === 400 || status === 422) return "The journal couldn't read this change";
  if (status === 403) return "Not allowed for this account";
  if (status === 404) return "What it changes is no longer there";
  if (status === 413) return "Too large";
  return `Turned down (${status})`;
}

/** Everything waiting: files first (they go first), then saves in order; refused ones last. */
export function useWaiting() {
  const saves = usePendingSaves();
  const files = useWaitingFiles();
  return useMemo(() => {
    const items = [...files.map(describeFile), ...saves.queue.map(describeSave), ...saves.held.map(describeSave)];
    const going = items.filter((i) => !i.refused);
    const refused = items.filter((i) => i.refused);
    return { items: [...going, ...refused], going, refused, marks: new Set(going.flatMap((i) => i.marks)), refusedMarks: new Set(refused.flatMap((i) => i.marks)) };
  }, [saves, files]);
}

/** How many things are waiting (refused included): the quiet dot shows while there are any. */
export function useWaitingCount() {
  const { items } = useWaiting();
  return items.reduce((n, i) => n + i.count, 0);
}

const NAMES: Record<WaitingKind, [string, string]> = {
  moment: ["moment", "moments"],
  person: ["person", "people"],
  practice: ["practice change", "practice changes"],
  tick: ["tick", "ticks"],
  reflection: ["reflection", "reflections"],
  weekly: ["weekly reflection", "weekly reflections"],
  letter: ["letter", "letters"],
  portrait: ["portrait", "portraits"],
  profile: ["profile change", "profile changes"],
  photo: ["photo", "photos"],
  voice: ["voice note", "voice notes"],
  video: ["video", "videos"],
  change: ["change", "changes"],
};
const ORDER: WaitingKind[] = ["moment", "person", "photo", "voice", "video", "tick", "reflection", "weekly", "letter", "portrait", "practice", "profile", "change"];

/** "2 moments · 1 photo · 1 video (48 MB) · 3 ticks". */
export function summarise(items: WaitingItem[]) {
  const by = new Map<WaitingKind, { n: number; bytes: number }>();
  for (const i of items) {
    const g = by.get(i.kind) ?? { n: 0, bytes: 0 };
    by.set(i.kind, { n: g.n + i.count, bytes: g.bytes + i.bytes });
  }
  return ORDER.filter((k) => by.has(k))
    .map((k) => {
      const { n, bytes } = by.get(k)!;
      const big = (k === "video" || k === "voice" || k === "photo") && bytes >= 1_000_000;
      return `${n} ${NAMES[k][n === 1 ? 0 : 1]}${big ? ` (${formatBytes(bytes)})` : ""}`;
    })
    .join(" · ");
}

export function formatBytes(n: number) {
  if (n < 1000) return `${n} B`;
  if (n < 1_000_000) return `${Math.round(n / 1000)} KB`;
  if (n < 1_000_000_000) return `${(n / 1_000_000).toFixed(n < 10_000_000 ? 1 : 0)} MB`;
  return `${(n / 1_000_000_000).toFixed(1)} GB`;
}

/** Try a refused item again. */
export async function tryAgain(item: WaitingItem) {
  if (item.file) {
    await retryMedia(item.key);
    if (navigator.onLine) await flush();
  } else await retrySave(item.key);
}

/** Give up on a refused item. */
export async function giveUp(item: WaitingItem) {
  if (item.file) await dropPendingMedia(item.key);
  else await removeSave(item.key);
}

// The list of what's waiting opens from the pill, the quiet dot and Settings.
let sheetOpen = false;
const sheetListeners = new Set<() => void>();
export function openWaiting(open = true) {
  sheetOpen = open;
  sheetListeners.forEach((l) => l());
}
export function useWaitingOpen() {
  return useSyncExternalStore(
    (cb) => {
      sheetListeners.add(cb);
      return () => sheetListeners.delete(cb);
    },
    () => sheetOpen,
    () => false
  );
}
