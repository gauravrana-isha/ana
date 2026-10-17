"use client";

import {
  createPractice,
  fetchAllMoments,
  fetchPeople,
  fetchPractices,
  saveDaily,
  saveDay,
  saveMoment,
  savePerson,
  saveWeekly,
} from "./journal";
import { openDeep, seal } from "./vault/vault";
import { newId, send } from "./outbox";
import type { DayLogEntries, PracticeField } from "./types";

/*
 * Bringing an ana export (format 2) into this journal, on the device: everything is sealed
 * here before it's sent, like any other write. Safe to run twice: practices are matched by
 * library id or name, days and reflections merge, moments and letters already here are skipped.
 */

type J = Record<string, unknown>;
const arr = (v: unknown): J[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as J[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const day = (v: unknown) => {
  const s = str(v);
  return s && !isNaN(new Date(s).getTime()) ? s.slice(0, 10) : null;
};

export async function importJournal(data: J, onProgress?: (what: string) => void) {
  if (!data || typeof data !== "object" || !Array.isArray(data.dayLogs)) throw new Error("That doesn't look like an ana export.");
  const counts = { practices: 0, days: 0, reflections: 0, people: 0, moments: 0, commitments: 0 };

  onProgress?.("Practices");
  const mine = await fetchPractices();
  const practiceId = new Map<string, string>();
  for (const p of arr(data.practices)) {
    const name = str(p.name)?.trim();
    if (!name || !str(p.id)) continue;
    const match = mine.find((m) => (p.catalogId && m.catalogId === p.catalogId) || m.name.toLowerCase() === name.toLowerCase());
    if (match) {
      practiceId.set(p.id as string, match.id);
      continue;
    }
    const created = await createPractice({
      name: name.slice(0, 50),
      iconName: str(p.iconName) ?? "Leaf",
      catalogId: str(p.catalogId) ?? null,
      hasDoneToggle: p.hasDoneToggle !== false,
      fields: (Array.isArray(p.fields) ? p.fields : []) as PracticeField[],
    });
    if (created) {
      mine.push(created);
      practiceId.set(p.id as string, created.id);
      counts.practices++;
    }
  }

  onProgress?.("Days");
  for (const log of arr(data.dayLogs)) {
    const d = day(log.date);
    if (!d || !log.entries || typeof log.entries !== "object") continue;
    const entries: DayLogEntries = {};
    for (const [k, v] of Object.entries(log.entries as J)) {
      const id = practiceId.get(k);
      if (id && v && typeof v === "object") entries[id] = v as DayLogEntries[string];
    }
    if (!Object.keys(entries).length) continue;
    await saveDay(d, entries);
    counts.days++;
  }

  onProgress?.("Reflections");
  for (const r of arr(data.dailyReflections)) {
    const d = day(r.date);
    if (!d) continue;
    await saveDaily(d, { answers: (r.answers ?? {}) as Record<string, string>, stamps: (r.stamps ?? {}) as Record<string, string[]>, moodKey: str(r.moodKey) ?? null });
    counts.reflections++;
  }
  for (const r of arr(data.weeklyReflections)) {
    const d = day(r.weekStart);
    if (!d) continue;
    await saveWeekly(d, { answers: (r.answers ?? {}) as Record<string, string>, stamps: (r.stamps ?? {}) as Record<string, string[]> });
    counts.reflections++;
  }

  onProgress?.("People");
  const people = await fetchPeople<{ id: string; name: string; photoId: string | null }>();
  const personId = new Map<string, string>();
  for (const p of arr(data.people)) {
    const name = str(p.name)?.trim();
    if (!name || !str(p.id)) continue;
    let match = people.find((x) => x.name.toLowerCase() === name.toLowerCase());
    if (!match) {
      const { id } = await savePerson(null, {
        name: name.slice(0, 80),
        relation: str(p.relation) ?? null,
        howMet: str(p.howMet) ?? null,
        birthday: day(p.birthday),
        notes: str(p.notes) ?? null,
      });
      match = { id, name, photoId: null };
      people.push(match);
      counts.people++;
    }
    personId.set(p.id as string, match.id);
  }

  onProgress?.("Moments");
  const moments = await fetchAllMoments();
  for (const m of arr(data.expressions)) {
    const d = day(m.date);
    if (!d) continue;
    const occurredAt = str(m.occurredAt) && !isNaN(new Date(m.occurredAt as string).getTime()) ? new Date(m.occurredAt as string).toISOString() : new Date(`${d}T12:00:00`).toISOString();
    const title = str(m.title) ?? "";
    if (moments.some((x) => x.title === title && x.occurredAt.slice(0, 10) === occurredAt.slice(0, 10))) continue;
    const tagged = (Array.isArray(m.personIds) ? m.personIds : []).map((id) => personId.get(String(id))).filter((x): x is string => !!x);
    const kind = (["writing", "moment", "audio", "video", "photo"].includes(str(m.kind) ?? "") ? m.kind : "writing") as "writing";
    await saveMoment(
      null,
      {
        title,
        kind,
        body: str(m.body) ?? "",
        occurredAt,
        place: str(m.place) ?? null,
        stamps: Array.isArray(m.stamps) ? (m.stamps as string[]) : [],
        lookBackOn: day(m.lookBackOn),
        lookBackAt: null,
        personIds: tagged,
        attachmentIds: [],
      },
      { people: [], attachments: [] }
    );
    counts.moments++;
  }

  onProgress?.("Letters");
  const existing = await openDeep(((await (await fetch("/api/commitment")).json()) ?? {}) as { current?: { body: string; createdAt: string } | null; history?: { body: string; createdAt: string }[] });
  const have = [existing.current, ...(existing.history ?? [])].filter(Boolean) as { body: string; createdAt: string }[];
  for (const c of arr(data.commitments)) {
    const body = str(c.body);
    const createdAt = str(c.createdAt);
    if (!body || !createdAt || have.some((h) => h.body === body && h.createdAt === new Date(createdAt).toISOString())) continue;
    await send("/api/commitment", "POST", {
      id: newId(),
      body: await seal(body),
      revisit: ["monthly", "quarterly", "never"].includes(str(c.revisit) ?? "") ? c.revisit : "monthly",
      // A letter from the export keeps its dates and goes into the history.
      history: { createdAt, revisitedAt: str(c.revisitedAt) ?? null, supersededAt: str(c.supersededAt) ?? new Date().toISOString() },
    });
    counts.commitments++;
  }

  const n = (k: number, one: string, many: string) => (k ? `${k} ${k === 1 ? one : many}` : null);
  const parts = [
    n(counts.days, "day", "days"),
    n(counts.reflections, "reflection", "reflections"),
    n(counts.moments, "moment", "moments"),
    n(counts.people, "person", "people"),
    n(counts.practices, "practice", "practices"),
    n(counts.commitments, "letter", "letters"),
  ].filter(Boolean);
  return parts.length ? `Brought in ${parts.join(", ")}.` : "Everything was already here.";
}

/** Your journal as JSON (format 2), opened on the device. Recordings and photos are listed, not included. */
export async function exportJournal(): Promise<Blob> {
  const res = await fetch("/api/export");
  if (!res.ok) throw new Error("Export failed");
  const data = await openDeep((await res.json()) as J & { people?: J[]; user?: J });
  const people = (data.people ?? []).map(({ birthdaySealed, birthdayMD: _md, ...p }) => ({ ...p, birthday: birthdaySealed ?? p.birthday ?? null }));
  const user = data.user ? { ...data.user, birthday: data.user.birthdaySealed ?? data.user.birthday ?? null, birthdaySealed: undefined } : data.user;
  return new Blob([JSON.stringify({ ...data, user, people }, null, 2)], { type: "application/json" });
}
