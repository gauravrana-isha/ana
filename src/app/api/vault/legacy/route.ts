import { allow } from "@/lib/ratelimit";
import { remindersChanged } from "@/lib/reminder-plan";
import { NextRequest, NextResponse, after } from "next/server";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";
import { isSealed, legacyLeft, sealed } from "@/lib/sealed";
import { removeStored, storageMode, uploadedSize, userPrefix } from "@/lib/storage";

/*
 * Moving a journal written before encryption into its sealed form. The device asks for
 * whatever is still plain, seals it with the journal key, and sends it back here; each value
 * is accepted only sealed, and only for the person's own rows. Files are re-uploaded
 * encrypted by the device, then swapped in here (the plain copy is deleted).
 */

export const dynamic = "force-dynamic";
const PAGE = 150;

const plainStr = (v: string | null | undefined) => !!v && !isSealed(v);
const plainJsonValues = (v: unknown) => !!v && typeof v === "object" && Object.values(v as object).some((x) => !isSealed(x));

export async function GET() {
  const user = await getCurrentUser();
  if (!user?.vaultAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const where = { userId: user.id };

  const [practices, dayLogs, dailies, weeklies, seva, moments, people, commitments, portraits, attachments] = await Promise.all([
    db.practice.findMany({ where, select: { id: true, name: true, iconName: true, catalogId: true, fields: true } }),
    db.dayLog.findMany({ where, select: { id: true, entries: true } }),
    db.dailyReflection.findMany({ where, select: { id: true, answers: true, stamps: true, moodKey: true } }),
    db.weeklyReflection.findMany({ where, select: { id: true, answers: true, stamps: true } }),
    db.sevaEntry.findMany({ where, select: { id: true, s1: true, s2: true, s3: true } }),
    db.expression.findMany({ where, select: { id: true, title: true, body: true, place: true, stamps: true } }),
    db.person.findMany({ where, select: { id: true, name: true, relation: true, howMet: true, notes: true, birthday: true } }),
    db.commitment.findMany({ where, select: { id: true, body: true } }),
    db.portrait.findMany({ where, select: { id: true, bodyWords: true, bodyNote: true, mindWords: true, mindNote: true, emotionWords: true, emotionNote: true, weights: true } }),
    db.attachment.findMany({ where: { ...where, sealed: false }, select: { id: true, kind: true, contentType: true, size: true } }),
  ]);

  const pick = <T,>(rows: T[], plain: (r: T) => boolean) => rows.filter(plain).slice(0, PAGE);
  const body = {
    user:
      plainStr(user.intention) || plainStr(user.place) || user.birthday
        ? { intention: user.intention, place: user.place, birthday: user.birthday?.toISOString().slice(0, 10) ?? null }
        : null,
    practices: pick(practices, (p) => plainStr(p.name) || typeof p.fields !== "string"),
    dayLogs: pick(dayLogs, (l) => plainJsonValues(l.entries)),
    dailies: pick(dailies, (d) => plainJsonValues(d.answers) || plainJsonValues(d.stamps) || plainStr(d.moodKey)),
    weeklies: pick(weeklies, (w) => plainJsonValues(w.answers) || plainJsonValues(w.stamps)),
    seva: pick(seva, (s) => plainStr(s.s1) || plainStr(s.s2) || plainStr(s.s3)),
    moments: pick(moments, (m) => plainStr(m.title) || plainStr(m.body) || plainStr(m.place) || (m.stamps !== null && typeof m.stamps !== "string")),
    people: pick(people, (p) => plainStr(p.name) || plainStr(p.relation) || plainStr(p.howMet) || plainStr(p.notes) || !!p.birthday).map((p) => ({
      ...p,
      birthday: p.birthday?.toISOString().slice(0, 10) ?? null,
    })),
    commitments: pick(commitments, (c) => plainStr(c.body)),
    portraits: pick(
      portraits,
      (p) =>
        [...p.bodyWords, ...p.mindWords, ...p.emotionWords].some((w) => !isSealed(w)) ||
        plainStr(p.bodyNote) || plainStr(p.mindNote) || plainStr(p.emotionNote) ||
        (p.weights !== null && typeof p.weights !== "string")
    ),
    attachments: attachments.slice(0, 20),
    left: await sealedUp(user.id),
  };
  return NextResponse.json(body);
}

const S = sealed();
const SN = sealed().nullable();
const SRecord = z.record(z.string().max(80), S);

const Update = z.object({
  user: z.object({ intention: SN, place: SN, birthday: SN }).nullable().optional(),
  practices: z.array(z.object({ id: z.string(), name: S, iconName: S, catalogId: SN, fields: S })).max(PAGE).default([]),
  dayLogs: z.array(z.object({ id: z.string(), entries: SRecord })).max(PAGE).default([]),
  dailies: z.array(z.object({ id: z.string(), answers: SRecord, stamps: SRecord, moodKey: SN })).max(PAGE).default([]),
  weeklies: z.array(z.object({ id: z.string(), answers: SRecord, stamps: SRecord })).max(PAGE).default([]),
  seva: z.array(z.object({ id: z.string(), s1: S, s2: S, s3: S })).max(PAGE).default([]),
  moments: z.array(z.object({ id: z.string(), title: S, body: S, place: SN, stamps: SN })).max(PAGE).default([]),
  people: z
    .array(z.object({ id: z.string(), name: S, relation: SN, howMet: SN, notes: SN, birthday: SN, birthdayMD: z.string().regex(/^\d{2}-\d{2}$/).nullable() }))
    .max(PAGE)
    .default([]),
  commitments: z.array(z.object({ id: z.string(), body: S })).max(PAGE).default([]),
  portraits: z
    .array(
      z.object({
        id: z.string(),
        bodyWords: z.array(S).max(40), bodyNote: SN,
        mindWords: z.array(S).max(40), mindNote: SN,
        emotionWords: z.array(S).max(40), emotionNote: SN,
        weights: SN,
      })
    )
    .max(PAGE)
    .default([]),
  /** Files re-uploaded encrypted: swap each in for its plain original. */
  attachments: z.array(z.object({ id: z.string(), pathname: z.string().max(300) })).max(20).default([]),
});

export async function POST(req: NextRequest) {
  // Reminders may have moved: the reminder job looks again on its next run.
  after(remindersChanged);
  const user = await getCurrentUser();
  if (!user?.vaultAt) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`vault-legacy:${user.id}`, 120))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const parsed = Update.safeParse(await req.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Everything sent here must be encrypted." }, { status: 400 });
  const d = parsed.data;
  const own = { userId: user.id };
  const json = (v: unknown) => v as Prisma.InputJsonValue;

  const ops: Prisma.PrismaPromise<unknown>[] = [
    // A birthday is only ever moved from plain to sealed, never cleared here.
    ...(d.user
      ? [db.user.update({ where: { id: user.id }, data: { intention: d.user.intention, place: d.user.place, ...(d.user.birthday ? { birthdaySealed: d.user.birthday, birthday: null } : {}) } })]
      : []),
    ...d.practices.map((p) =>
      db.practice.updateMany({ where: { id: p.id, ...own }, data: { name: p.name, iconName: p.iconName, catalogId: p.catalogId, fields: json(p.fields) } })
    ),
    ...d.dayLogs.map((l) => db.dayLog.updateMany({ where: { id: l.id, ...own }, data: { entries: json(l.entries) } })),
    ...d.dailies.map((r) =>
      db.dailyReflection.updateMany({ where: { id: r.id, ...own }, data: { answers: json(r.answers), stamps: json(r.stamps), moodKey: r.moodKey } })
    ),
    ...d.weeklies.map((r) => db.weeklyReflection.updateMany({ where: { id: r.id, ...own }, data: { answers: json(r.answers), stamps: json(r.stamps) } })),
    ...d.seva.map((s) => db.sevaEntry.updateMany({ where: { id: s.id, ...own }, data: { s1: s.s1, s2: s.s2, s3: s.s3 } })),
    ...d.moments.map((m) =>
      db.expression.updateMany({
        where: { id: m.id, ...own },
        data: { title: m.title, body: m.body, place: m.place, stamps: m.stamps === null ? Prisma.DbNull : json(m.stamps) },
      })
    ),
    ...d.people.map((p) =>
      db.person.updateMany({
        where: { id: p.id, ...own },
        data: { name: p.name, relation: p.relation, howMet: p.howMet, notes: p.notes, ...(p.birthday ? { birthdaySealed: p.birthday, birthdayMD: p.birthdayMD, birthday: null } : {}) },
      })
    ),
    ...d.commitments.map((c) => db.commitment.updateMany({ where: { id: c.id, ...own }, data: { body: c.body } })),
    ...d.portraits.map((p) =>
      db.portrait.updateMany({
        where: { id: p.id, ...own },
        data: {
          bodyWords: p.bodyWords, bodyNote: p.bodyNote,
          mindWords: p.mindWords, mindNote: p.mindNote,
          emotionWords: p.emotionWords, emotionNote: p.emotionNote,
          weights: p.weights === null ? Prisma.DbNull : json(p.weights),
        },
      })
    ),
  ];
  if (ops.length) await db.$transaction(ops);

  for (const a of d.attachments) {
    const old = await db.attachment.findFirst({ where: { id: a.id, ...own, sealed: false } });
    if (!old || !a.pathname.startsWith(`${userPrefix(user.id)}${old.kind}/`) || a.pathname.includes("..")) continue;
    // The encrypted copy was uploaded to wherever new files go now.
    const storage = storageMode();
    const size = await uploadedSize(storage, a.pathname);
    if (size === null) continue;
    await db.attachment.update({ where: { id: old.id }, data: { storage, pathname: a.pathname, size, sealed: true } });
    await removeStored(old.storage, old.pathname).catch(() => {});
  }

  return NextResponse.json({ ok: true, left: await sealedUp(user.id) });
}

/** What's still plain; when nothing is, note that the journal is fully sealed. */
async function sealedUp(userId: string) {
  const left = await legacyLeft(userId);
  if (left === 0) await db.user.updateMany({ where: { id: userId, vaultSealedAt: null }, data: { vaultSealedAt: new Date() } });
  return left;
}
