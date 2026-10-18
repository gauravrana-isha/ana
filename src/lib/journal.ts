"use client";

import type { QueryClient } from "@tanstack/react-query";
import type { DayLogEntries, Practice, PracticeField } from "./types";
import type { Moment } from "./moment-types";
import type { AttachmentDTO } from "./media-client";
import { computeInsights, type InsightsRaw } from "./compute/insights";
import { computeDigest, type DigestRaw } from "./compute/digest";
import type { SearchIndex } from "./compute/search";
import { openDeep, seal, sealFields, sealValues } from "./vault/vault";
import { newId, send } from "./outbox";
import { shownQuestions, toStored, type QuestionSets, type ReflectionKind } from "./questions";

/*
 * Reading and writing the journal from the device. Everything personal is sealed here
 * before it's sent and opened here after it arrives; the server only stores what it can't
 * read. Writes that make sense offline go through the outbox (`queue: true`).
 */

async function getOpen<T>(url: string, fallback: T): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) return fallback;
  return openDeep((await res.json()) as T);
}

// ---------- what's on screen ----------

/** The app's query cache, so a change shows at once (and stays, offline, until it's sent). */
let screen: QueryClient | null = null;
export function showChangesIn(qc: QueryClient) {
  screen = qc;
}
function onScreenPractices(change: (list: Practice[]) => Practice[]) {
  screen?.setQueryData<Practice[]>(["practices"], (old) => change(Array.isArray(old) ? old : []));
}

// ---------- practices ----------

export async function fetchPractices(): Promise<Practice[]> {
  const list = await getOpen<Practice[]>("/api/practices", []);
  return Array.isArray(list) ? list : [];
}

export async function createPractice(p: {
  name: string;
  iconName: string;
  catalogId?: string | null;
  hasDoneToggle: boolean;
  fields: PracticeField[];
}) {
  const plain = { id: newId(), name: p.name, iconName: p.iconName, catalogId: p.catalogId ?? null, fields: p.fields, tier: (p.catalogId ? "FIXED" : "CUSTOM") as Practice["tier"], hasDoneToggle: p.hasDoneToggle };
  const body = await sealFields(plain, ["name", "iconName", "catalogId", "fields"]);
  // On screen straight away (offline it waits in the outbox; its id makes a resend safe).
  const now = new Date().toISOString();
  const local: Practice = { ...plain, userId: "", order: Number.MAX_SAFE_INTEGER, createdAt: now, updatedAt: now };
  onScreenPractices((list) => (list.some((x) => x.id === local.id) ? list : [...list, { ...local, order: list.length }]));
  const res = await send<Practice>("/api/practices", "POST", body, { queue: true });
  return res.queued ? local : openDeep(res.data);
}

/** Change a practice's name or fields (the whole field list, already merged here). */
export async function editPractice(id: string, change: { name?: string; fields?: PracticeField[] }) {
  onScreenPractices((list) => list.map((x) => (x.id === id ? { ...x, ...change } : x)));
  await send("/api/practices", "PATCH", { id, ...(await sealFields(change, ["name", "fields"])) }, { queue: true });
}

/**
 * A practice's stored fields with the editor's changes applied: usual values (`default`, for
 * rhythm practices) and fill-on-tick values. Library practices may not have stored a field
 * yet; then just the override is kept. `null` clears a value.
 */
export function mergeFields(
  stored: PracticeField[] | unknown,
  spec: { key: string; kind: PracticeField["kind"] }[],
  draft: Record<string, { default?: string | number | null; fill?: number | null }>
): PracticeField[] {
  const fields = (Array.isArray(stored) ? stored.map((f) => ({ ...f })) : []) as PracticeField[];
  for (const s of spec) {
    const change = draft[s.key];
    if (!change) continue;
    let f = fields.find((x) => x.key === s.key);
    if (!f) {
      f = { key: s.key, kind: s.kind };
      fields.push(f);
    }
    if (change.default !== undefined) {
      if (change.default === null) delete f.default;
      else f.default = change.default;
    }
    if (change.fill !== undefined) {
      if (change.fill === null) delete f.fill;
      else f.fill = change.fill;
    }
  }
  return fields;
}

export async function deletePractice(id: string) {
  onScreenPractices((list) => list.filter((x) => x.id !== id));
  await send("/api/practices", "DELETE", { id }, { queue: true });
}

export async function reorderPractices(ids: string[]) {
  onScreenPractices((list) => ids.map((id) => list.find((x) => x.id === id)).filter((x): x is Practice => !!x).map((x, order) => ({ ...x, order })));
  await send("/api/practices", "PATCH", { reorder: ids.map((id, order) => ({ id, order })) }, { queue: true });
}

// ---------- day logs ----------

export async function fetchDay(date: string): Promise<{ date: string; entries: DayLogEntries }> {
  const data = await getOpen<{ date?: string; entries?: DayLogEntries }>(`/api/days/${date}`, {});
  return { date: data.date ?? date, entries: data.entries ?? {} };
}

export async function fetchWeek(weekStart: string): Promise<Record<string, DayLogEntries>> {
  return getOpen(`/api/days/week/${weekStart}`, {});
}

/** Save some practices' entries for a day (each practice's entry is sealed on its own). */
export async function saveDay(date: string, entries: DayLogEntries) {
  return send<{ entries?: Record<string, unknown> }>(`/api/days/${date}`, "PATCH", { entries: await sealValues(entries) }, { queue: true });
}


// ---------- reflections ----------

export interface DailyReflection {
  date: string;
  answers: Record<string, string>;
  stamps: Record<string, string[]>;
  moodKey: string | null;
}

export async function fetchDaily(date: string): Promise<DailyReflection> {
  const d = await getOpen<Partial<DailyReflection>>(`/api/daily/${date}`, {});
  return { date, answers: d.answers ?? {}, stamps: d.stamps ?? {}, moodKey: d.moodKey ?? null };
}

/** Save a day's reflection (merged by question on the server); waits in the outbox offline. */
export async function saveDaily(date: string, r: Omit<DailyReflection, "date">): Promise<DailyReflection> {
  const res = await send<Partial<DailyReflection>>(
    `/api/daily/${date}`,
    "PATCH",
    { answers: await sealValues(r.answers), stamps: await sealValues(r.stamps), moodKey: r.moodKey === null ? null : await seal(r.moodKey) },
    { queue: true }
  );
  if (res.queued) return { date, ...r };
  const d = await openDeep(res.data);
  return { date, answers: d.answers ?? {}, stamps: d.stamps ?? {}, moodKey: d.moodKey ?? null };
}

export interface WeeklyReflection {
  weekStart: string;
  answers: Record<string, string>;
  stamps: Record<string, string[]>;
}

export async function fetchWeekly(weekStart: string): Promise<WeeklyReflection> {
  const d = await getOpen<Partial<WeeklyReflection>>(`/api/weekly/${weekStart}`, {});
  return { weekStart, answers: d.answers ?? {}, stamps: d.stamps ?? {} };
}

export async function saveWeekly(weekStart: string, r: Omit<WeeklyReflection, "weekStart">): Promise<WeeklyReflection> {
  const res = await send<Partial<WeeklyReflection>>(
    `/api/weekly/${weekStart}`,
    "PATCH",
    { answers: await sealValues(r.answers), stamps: await sealValues(r.stamps) },
    { queue: true }
  );
  if (res.queued) return { weekStart, ...r };
  const d = await openDeep(res.data);
  return { weekStart, answers: d.answers ?? {}, stamps: d.stamps ?? {} };
}

/** Keep someone's reflection questions (both lists, sealed together). */
export async function saveQuestions(sets: QuestionSets) {
  const stored = Object.fromEntries(Object.entries(sets).map(([k, list]) => [k, toStored(k as ReflectionKind, list)]));
  await send("/api/me", "PATCH", { questions: await seal(stored) }, { queue: true });
}

// ---------- moments ----------

/** The device's copy of every moment, and when it last caught up with the server. */
export interface MomentsCopy {
  items: Moment[];
  syncedAt: string | null;
}

const newestFirst = (a: Moment, b: Moment) => b.occurredAt.localeCompare(a.occurredAt) || b.createdAt.localeCompare(a.createdAt);

/**
 * Bring the copy up to date: only what changed since it last caught up (edits, new moments,
 * people renamed or removed, deletions), or everything when there's no copy yet.
 */
export async function syncMoments(copy?: MomentsCopy): Promise<MomentsCopy> {
  const since = copy?.syncedAt;
  const res = await fetch(since ? `/api/expressions?since=${encodeURIComponent(since)}` : "/api/expressions");
  if (!res.ok) {
    if (copy) return copy;
    throw new Error("Couldn't load moments");
  }
  type Reply = { items: Moment[]; deleted?: string[]; deletedPeople?: string[]; full?: boolean; now: string };
  const d = await openDeep((await res.json()) as Reply);
  const changed = d.items.map(normaliseMoment);
  if (d.full || !copy) return { items: changed.sort(newestFirst), syncedAt: d.now };
  const gone = new Set(d.deleted ?? []);
  const gonePeople = new Set(d.deletedPeople ?? []);
  const byId = new Map(copy.items.map((m) => [m.id, m]));
  for (const m of changed) byId.set(m.id, m);
  const items = [...byId.values()]
    .filter((m) => !gone.has(m.id))
    .map((m) => (gonePeople.size && m.people.some((p) => gonePeople.has(p.id)) ? { ...m, people: m.people.filter((p) => !gonePeople.has(p.id)) } : m))
    .sort(newestFirst);
  return { items, syncedAt: d.now };
}

/** Every moment, freshly fetched (for one-off jobs like importing). */
export async function fetchAllMoments(): Promise<Moment[]> {
  return (await syncMoments()).items;
}

export async function fetchMoment(id: string): Promise<Moment | null> {
  const res = await fetch(`/api/expressions/${id}`);
  if (!res.ok) return null;
  return normaliseMoment(await openDeep((await res.json()) as Moment));
}

/** Older moments may be plain or sealed; either way the screen gets the same shape. */
export function normaliseMoment(m: Moment): Moment {
  return { ...m, title: m.title ?? "", body: m.body ?? "", stamps: Array.isArray(m.stamps) ? m.stamps : [] };
}

export interface MomentInput {
  title: string;
  kind: Moment["kind"];
  body: string;
  occurredAt: string;
  place: string | null;
  stamps: string[];
  lookBackOn: string | null;
  lookBackAt: string | null;
  personIds: string[];
  attachmentIds: string[];
}

/**
 * Keep a new moment or save changes. Offline (with nothing left to upload) it waits in the
 * outbox, and the moment returned is built here so it shows straight away.
 */
export async function saveMoment(
  existing: Moment | null,
  input: MomentInput,
  ctx: { people: Moment["people"]; attachments: AttachmentDTO[] }
): Promise<{ moment: Moment; queued: boolean }> {
  const id = existing?.id ?? newId();
  const body = { ...(existing ? {} : { id }), ...(await sealFields(input, ["title", "body", "place", "stamps"])) };
  const res = await send<Moment>(existing ? `/api/expressions/${id}` : "/api/expressions", existing ? "PATCH" : "POST", body, { queue: true });
  if (!res.queued) return { moment: normaliseMoment(await openDeep(res.data)), queued: false };
  const at = new Date(input.occurredAt);
  return {
    queued: true,
    moment: {
      id,
      title: input.title,
      kind: input.kind,
      body: input.body,
      place: input.place,
      stamps: input.stamps,
      lookBackOn: input.lookBackOn,
      lookBackAt: input.lookBackAt,
      occurredAt: at.toISOString(),
      hasTime: true,
      people: ctx.people.filter((p) => input.personIds.includes(p.id)),
      attachments: ctx.attachments.filter((a) => input.attachmentIds.includes(a.id)),
      createdAt: existing?.createdAt ?? new Date().toISOString(),
    },
  };
}

export async function deleteMoment(id: string) {
  return send(`/api/expressions/${id}`, "DELETE", undefined, { queue: true });
}

// ---------- people ----------

export interface PersonInput {
  name: string;
  relation?: string | null;
  howMet?: string | null;
  birthday?: string | null;
  notes?: string | null;
  photoId?: string;
}

export async function fetchPeople<T extends { name: string }>(): Promise<T[]> {
  const list = await getOpen<T[]>("/api/people", []);
  return (Array.isArray(list) ? list : []).sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchPerson<T>(id: string): Promise<T | null> {
  const res = await fetch(`/api/people/${id}`);
  if (!res.ok) return null;
  return openDeep((await res.json()) as T);
}

/** Add someone or save changes. Offline (no photo to upload) it waits in the outbox. */
export async function savePerson(existing: { id: string } | null, p: PersonInput) {
  const id = existing?.id ?? newId();
  const sealedFields = await sealFields(
    { name: p.name, relation: p.relation, howMet: p.howMet, birthday: p.birthday, notes: p.notes },
    ["name", "relation", "howMet", "birthday", "notes"]
  );
  const body = {
    ...(existing ? {} : { id }),
    ...sealedFields,
    ...(p.birthday !== undefined ? { birthdayMD: p.birthday ? p.birthday.slice(5, 10) : null } : {}),
    ...(p.photoId ? { photoId: p.photoId } : {}),
  };
  // Offline it waits in the outbox (a new photo waits too, and goes up first).
  const res = await send(existing ? `/api/people/${id}` : "/api/people", existing ? "PATCH" : "POST", body, { queue: true });
  return { id, queued: res.queued };
}

export async function deletePerson(id: string) {
  return send(`/api/people/${id}`, "DELETE", undefined, { queue: true });
}

// ---------- commitment ----------

export interface Letter {
  id: string;
  body: string;
  revisit: "monthly" | "quarterly" | "never";
  revisitedAt: string | null;
  createdAt: string;
  supersededAt: string | null;
}

export async function fetchCommitment(): Promise<{ current: Letter | null; due: boolean; history: Letter[] }> {
  return getOpen("/api/commitment", { current: null, due: false, history: [] });
}

/** Write (or rewrite) the letter. Offline it waits in the outbox. */
export async function saveCommitment(body: string, revisit: Letter["revisit"]) {
  return send("/api/commitment", "POST", { id: newId(), body: await seal(body), revisit }, { queue: true });
}

// ---------- portraits ----------

export async function fetchPortraits<T>(): Promise<T[]> {
  const list = await getOpen<T[]>("/api/portraits", []);
  return Array.isArray(list) ? list : [];
}

type Ring = { words: string[]; note: string | null };

/** Keep a portrait: each word, each line and the weights sealed. */
export async function savePortrait(p: { body: Ring; mind: Ring; emotion: Ring; weights: Record<string, number> }) {
  const ring = async (r: Ring) => ({ words: await Promise.all(r.words.map((w) => seal(w))), note: r.note ? await seal(r.note) : null });
  const used = new Set([...p.body.words, ...p.mind.words, ...p.emotion.words]);
  const weights = Object.fromEntries(Object.entries(p.weights).filter(([w]) => used.has(w)));
  const id = newId();
  // On screen straight away, newest first (offline it waits in the outbox).
  screen?.setQueryData<unknown[]>(["portraits"], (old) => [{ id, body: p.body, mind: p.mind, emotion: p.emotion, weights, createdAt: new Date().toISOString() }, ...(Array.isArray(old) ? old : [])]);
  return send(
    "/api/portraits",
    "POST",
    {
      id,
      body: await ring(p.body),
      mind: await ring(p.mind),
      emotion: await ring(p.emotion),
      ...(Object.keys(weights).length ? { weights: await seal(weights) } : {}),
    },
    { queue: true }
  );
}

// ---------- today ----------

/** A question counts as answered with words written or a stamp chosen. */
export function answeredCount(keys: string[], answers: Record<string, string>, stamps: Record<string, string[]>) {
  return keys.filter((k) => (typeof answers[k] === "string" && answers[k].trim()) || (stamps[k]?.length ?? 0) > 0).length;
}

export interface TodayData {
  lookBack: Moment[];
  onThisDay: Moment[];
  birthdays: { id: string; name: string; photoId: string | null; inDays: number }[];
  daily: { answered: number; total: number; mood: string | null } | null;
  commitment?: { body: string; createdAt: string } | null;
  commitmentMissing?: boolean;
}

export async function fetchToday(date: string): Promise<TodayData> {
  type Raw = Omit<TodayData, "daily"> & { daily: { answers: Record<string, string>; stamps: Record<string, string[]>; questions: QuestionSets | null; mood: string | null } | null };
  const raw = await getOpen<Raw | null>(`/api/today?date=${date}`, null);
  if (!raw) return { lookBack: [], onThisDay: [], birthdays: [], daily: null };
  const keys = shownQuestions("daily", raw.daily?.questions).map((x) => x.key);
  return {
    ...raw,
    lookBack: raw.lookBack.map(normaliseMoment),
    onThisDay: raw.onThisDay.map(normaliseMoment),
    daily: raw.daily ? { answered: answeredCount(keys, raw.daily.answers, raw.daily.stamps), total: keys.length, mood: raw.daily.mood } : null,
  };
}

// ---------- worked out on the device ----------

export async function fetchInsights(date: string) {
  const raw = await getOpen<InsightsRaw | null>(`/api/insights?date=${date}`, null);
  if (!raw) throw new Error("Couldn't load");
  return computeInsights(raw, date);
}

export async function fetchDigest(weekStart: string, today: string) {
  const raw = await getOpen<DigestRaw | null>(`/api/digest/${weekStart}`, null);
  if (!raw) throw new Error("Couldn't load");
  return computeDigest(raw, weekStart, today);
}

/** The Profile's "This month": days with a reflection, weekly reflections, moments, practice days. */
export async function fetchProfileStats(date: string) {
  type Raw = {
    memberSince: string;
    month: {
      dailies: { answers: Record<string, string>; stamps: Record<string, string[]>; moodKey: string | null }[];
      weekly: number;
      expressions: number;
      logs: { entries: Record<string, { done?: boolean; values?: Record<string, unknown> }> }[];
    };
  };
  const raw = await getOpen<Raw | null>(`/api/profile?date=${date}`, null);
  if (!raw) throw new Error("Couldn't load");
  const m = raw.month;
  const daily = m.dailies.filter(
    (d) =>
      d.moodKey ||
      Object.values(d.answers ?? {}).some((v) => typeof v === "string" && v.trim()) ||
      Object.values(d.stamps ?? {}).some((v) => v?.length)
  ).length;
  const tracker = m.logs.filter((l) =>
    Object.values(l.entries ?? {}).some((e) => e?.done || Object.values(e?.values ?? {}).some((v) => v !== "" && v !== 0 && v != null))
  ).length;
  return { memberSince: raw.memberSince, month: { daily, weekly: m.weekly, expressions: m.expressions, tracker } };
}

/** Everything search looks through, opened: people and reflections from the server, moments from the device's copy. */
export async function fetchSearchIndex(moments: Moment[]): Promise<SearchIndex> {
  const rest = await getOpen<Omit<SearchIndex, "moments">>("/api/search", { people: [], daily: [], weekly: [] });
  return {
    ...rest,
    moments: moments.map((m) => ({ id: m.id, title: m.title, body: m.body, kind: m.kind, occurredAt: m.occurredAt, date: m.occurredAt, place: m.place, people: m.people.map((p) => ({ person: { name: p.name } })) })),
  };
}
