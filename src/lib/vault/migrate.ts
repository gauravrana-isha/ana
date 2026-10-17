"use client";

import { isSealed } from "./crypto";
import { seal, sealValues } from "./vault";
import { storeFile, type MediaKind } from "../media-client";

/*
 * Moving a journal written before encryption into its sealed form, once, on the device that
 * set up the key: ask the server for whatever is still plain, seal it here, send it back.
 * Files are downloaded, encrypted and uploaded again, then swapped in (the plain copy goes).
 */

type J = Record<string, unknown>;
type Legacy = {
  user: { intention: string | null; place: string | null; birthday: string | null } | null;
  practices: { id: string; name: string; iconName: string; catalogId: string | null; fields: unknown }[];
  dayLogs: { id: string; entries: J }[];
  dailies: { id: string; answers: J; stamps: J; moodKey: string | null }[];
  weeklies: { id: string; answers: J; stamps: J }[];
  seva: { id: string; s1: string; s2: string; s3: string }[];
  moments: { id: string; title: string; body: string; place: string | null; stamps: unknown }[];
  people: { id: string; name: string; relation: string | null; howMet: string | null; notes: string | null; birthday: string | null }[];
  commitments: { id: string; body: string }[];
  portraits: { id: string; bodyWords: string[]; bodyNote: string | null; mindWords: string[]; mindNote: string | null; emotionWords: string[]; emotionNote: string | null; weights: unknown }[];
  attachments: { id: string; kind: MediaKind; contentType: string; size: number }[];
  left: number;
};

const sealIf = async (v: unknown) => (isSealed(v) ? v : seal(v));
const sealOrNull = async (v: unknown) => (v === null || v === undefined ? null : sealIf(v));

let running: Promise<void> | null = null;
let report: (done: number, total: number) => void = () => {};

/** Seal everything still plain. One run at a time: a second call joins the first. */
export function sealEverything(me: { id: string; storage: "blob" | "local" }, onProgress: (done: number, total: number) => void) {
  report = onProgress;
  running ??= run(me, (d, t) => report(d, t)).finally(() => {
    running = null;
  });
  return running;
}

const BATCH = 20;

async function post(body: Record<string, unknown>) {
  const res = await fetch("/api/vault/legacy", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) throw new Error("Some of your journal couldn't be locked. Please try again.");
}

/**
 * Round by round: fetch what's still plain, seal it here, and send it back in small
 * batches (files one at a time), so the count moves as the work actually happens.
 */
async function run(me: { id: string; storage: "blob" | "local" }, onProgress: (done: number, total: number) => void) {
  let total = 0;
  let done = 0;
  let lastLeft = Infinity;
  let stuck = 0;
  for (;;) {
    const res = await fetch("/api/vault/legacy", { cache: "no-store" });
    if (!res.ok) throw new Error("Couldn't reach your journal. Check your connection and try again.");
    const d = (await res.json()) as Legacy;
    total = Math.max(total, done + d.left);
    onProgress(Math.min(done, total), total);
    if (d.left === 0) return;
    if (d.left >= lastLeft && ++stuck >= 3) throw new Error("Some of your journal couldn't be locked. Please try again in a moment.");
    lastLeft = d.left;

    // Everything in this round, sealed, as [kind, row] pairs.
    const items: [string, unknown][] = [];
    if (d.user) items.push(["user", { intention: await sealOrNull(d.user.intention), place: await sealOrNull(d.user.place), birthday: await sealOrNull(d.user.birthday) }]);
    for (const p of d.practices) items.push(["practices", { id: p.id, name: await sealIf(p.name), iconName: await sealIf(p.iconName), catalogId: await sealOrNull(p.catalogId), fields: await sealIf(p.fields ?? []) }]);
    for (const l of d.dayLogs) items.push(["dayLogs", { id: l.id, entries: await sealValues(l.entries ?? {}) }]);
    for (const r of d.dailies) items.push(["dailies", { id: r.id, answers: await sealValues(r.answers ?? {}), stamps: await sealValues(r.stamps ?? {}), moodKey: await sealOrNull(r.moodKey) }]);
    for (const r of d.weeklies) items.push(["weeklies", { id: r.id, answers: await sealValues(r.answers ?? {}), stamps: await sealValues(r.stamps ?? {}) }]);
    for (const x of d.seva) items.push(["seva", { id: x.id, s1: await sealIf(x.s1), s2: await sealIf(x.s2), s3: await sealIf(x.s3) }]);
    for (const m of d.moments) items.push(["moments", { id: m.id, title: await sealIf(m.title ?? ""), body: await sealIf(m.body ?? ""), place: await sealOrNull(m.place), stamps: await sealOrNull(m.stamps) }]);
    for (const p of d.people)
      items.push([
        "people",
        {
          id: p.id,
          name: await sealIf(p.name),
          relation: await sealOrNull(p.relation),
          howMet: await sealOrNull(p.howMet),
          notes: await sealOrNull(p.notes),
          birthday: await sealOrNull(p.birthday),
          birthdayMD: p.birthday ? p.birthday.slice(5, 10) : null,
        },
      ]);
    for (const c of d.commitments) items.push(["commitments", { id: c.id, body: await sealIf(c.body) }]);
    for (const p of d.portraits)
      items.push([
        "portraits",
        {
          id: p.id,
          bodyWords: await Promise.all(p.bodyWords.map(sealIf)),
          bodyNote: await sealOrNull(p.bodyNote),
          mindWords: await Promise.all(p.mindWords.map(sealIf)),
          mindNote: await sealOrNull(p.mindNote),
          emotionWords: await Promise.all(p.emotionWords.map(sealIf)),
          emotionNote: await sealOrNull(p.emotionNote),
          weights: await sealOrNull(p.weights),
        },
      ]);

    for (let i = 0; i < items.length; i += BATCH) {
      const batch = items.slice(i, i + BATCH);
      const body: Record<string, unknown> = {};
      for (const [kind, row] of batch) {
        if (kind === "user") body.user = row;
        else ((body[kind] ??= []) as unknown[]).push(row);
      }
      await post(body);
      done += batch.length;
      onProgress(Math.min(done, total), total);
    }

    // Files: downloaded, encrypted here, uploaded again, swapped in. One at a time.
    for (const a of d.attachments) {
      const file = await fetch(`/api/media/${a.id}`);
      if (file.ok) {
        const blob = new Blob([await file.arrayBuffer()], { type: a.contentType });
        const { pathname } = await storeFile(blob, a.kind, { userId: me.id, storage: me.storage, replacing: a.id });
        await post({ attachments: [{ id: a.id, pathname }] });
      }
      done++;
      onProgress(Math.min(done, total), total);
    }
  }
}
