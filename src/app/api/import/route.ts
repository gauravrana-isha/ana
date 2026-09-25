import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

type J = Record<string, unknown>;
const arr = (v: unknown): J[] => (Array.isArray(v) ? (v.filter((x) => x && typeof x === "object") as J[]) : []);
const str = (v: unknown) => (typeof v === "string" ? v : undefined);
const date = (v: unknown) => {
  const d = typeof v === "string" ? new Date(v) : null;
  return d && !isNaN(d.getTime()) ? d : null;
};
const json = (v: unknown) => (v ?? {}) as Prisma.InputJsonValue;

/**
 * Bring an ana export (format 2) into this account. Safe to run twice: practices are matched
 * by library id or name, days are merged, and moments already present are skipped.
 */
export async function POST(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const data = (await req.json().catch(() => null)) as J | null;
  if (!data || typeof data !== "object" || !Array.isArray(data.dayLogs)) {
    return NextResponse.json({ error: "That doesn't look like an ana export." }, { status: 400 });
  }
  if (JSON.stringify(data).length > 20 * 1024 * 1024) return NextResponse.json({ error: "That file is too large." }, { status: 413 });

  try {
    const counts = { practices: 0, days: 0, reflections: 0, people: 0, moments: 0, commitments: 0 };

    // Practices: exported id → this account's id.
    const mine = await db.practice.findMany({ where: { userId: user.id } });
    const maxOrder = mine.reduce((m, p) => Math.max(m, p.order), -1);
    const practiceId = new Map<string, string>();
    let order = maxOrder;
    for (const p of arr(data.practices)) {
      const name = str(p.name)?.trim();
      if (!name || !str(p.id)) continue;
      const match = mine.find((m) => (p.catalogId && m.catalogId === p.catalogId) || m.name.toLowerCase() === name.toLowerCase());
      if (match) {
        practiceId.set(p.id as string, match.id);
        continue;
      }
      const created = await db.practice.create({
        data: {
          userId: user.id,
          name: name.slice(0, 50),
          iconName: str(p.iconName) ?? "Leaf",
          catalogId: str(p.catalogId) ?? null,
          tier: p.tier === "FIXED" ? "FIXED" : "CUSTOM",
          hasDoneToggle: p.hasDoneToggle !== false,
          order: ++order,
          fields: json(Array.isArray(p.fields) ? p.fields : []),
        },
      });
      mine.push(created);
      practiceId.set(p.id as string, created.id);
      counts.practices++;
    }

    // Days: merge entries, remapping practice ids.
    for (const log of arr(data.dayLogs)) {
      const d = date(log.date);
      if (!d || !log.entries || typeof log.entries !== "object") continue;
      const entries: J = {};
      for (const [k, v] of Object.entries(log.entries as J)) {
        const id = practiceId.get(k);
        if (id) entries[id] = v;
      }
      if (!Object.keys(entries).length) continue;
      const existing = await db.dayLog.findUnique({ where: { userId_date: { userId: user.id, date: d } } });
      const merged = { ...((existing?.entries as J) ?? {}), ...entries };
      if (existing && JSON.stringify(existing.entries) === JSON.stringify(merged)) continue;
      await db.dayLog.upsert({
        where: { userId_date: { userId: user.id, date: d } },
        create: { userId: user.id, date: d, entries: json(merged) },
        update: { entries: json(merged) },
      });
      counts.days++;
    }

    for (const r of arr(data.dailyReflections)) {
      const d = date(r.date);
      if (!d) continue;
      const cur = await db.dailyReflection.findUnique({ where: { userId_date: { userId: user.id, date: d } } });
      if (cur && JSON.stringify([cur.answers, cur.stamps, cur.moodKey]) === JSON.stringify([r.answers ?? {}, r.stamps ?? {}, str(r.moodKey) ?? null])) continue;
      await db.dailyReflection.upsert({
        where: { userId_date: { userId: user.id, date: d } },
        create: { userId: user.id, date: d, answers: json(r.answers), stamps: json(r.stamps), moodKey: str(r.moodKey) ?? null },
        update: { answers: json(r.answers), stamps: json(r.stamps), moodKey: str(r.moodKey) ?? null },
      });
      counts.reflections++;
    }
    for (const r of arr(data.weeklyReflections)) {
      const d = date(r.weekStart);
      if (!d) continue;
      const cur = await db.weeklyReflection.findUnique({ where: { userId_weekStart: { userId: user.id, weekStart: d } } });
      if (cur && JSON.stringify([cur.answers, cur.stamps]) === JSON.stringify([r.answers ?? {}, r.stamps ?? {}])) continue;
      await db.weeklyReflection.upsert({
        where: { userId_weekStart: { userId: user.id, weekStart: d } },
        create: { userId: user.id, weekStart: d, answers: json(r.answers), stamps: json(r.stamps) },
        update: { answers: json(r.answers), stamps: json(r.stamps) },
      });
      counts.reflections++;
    }

    // People: match by name, else create.
    const people = await db.person.findMany({ where: { userId: user.id } });
    const personId = new Map<string, string>();
    for (const p of arr(data.people)) {
      const name = str(p.name)?.trim();
      if (!name || !str(p.id)) continue;
      let match = people.find((x) => x.name.toLowerCase() === name.toLowerCase());
      if (!match) {
        match = await db.person.create({
          data: {
            userId: user.id,
            name: name.slice(0, 80),
            relation: str(p.relation) ?? null,
            howMet: str(p.howMet) ?? null,
            birthday: date(p.birthday),
            notes: str(p.notes) ?? null,
          },
        });
        people.push(match);
        counts.people++;
      }
      personId.set(p.id as string, match.id);
    }

    // Moments: skip ones already here (same title and time).
    for (const m of arr(data.expressions)) {
      const d = date(m.date);
      if (!d) continue;
      const occurredAt = date(m.occurredAt);
      const title = str(m.title) ?? "";
      const dup = await db.expression.findFirst({ where: { userId: user.id, title, date: d, ...(occurredAt ? { occurredAt } : {}) } });
      if (dup) continue;
      const tagged = (Array.isArray(m.personIds) ? m.personIds : []).map((id) => personId.get(String(id))).filter((x): x is string => !!x);
      await db.expression.create({
        data: {
          userId: user.id,
          title,
          date: d,
          occurredAt,
          kind: str(m.kind) ?? "writing",
          body: str(m.body) ?? "",
          place: str(m.place) ?? null,
          stamps: json(Array.isArray(m.stamps) ? m.stamps : []),
          lookBackOn: date(m.lookBackOn),
          refDates: json(Array.isArray(m.refDates) ? m.refDates : []),
          people: { create: tagged.map((pid) => ({ personId: pid })) },
        },
      });
      counts.moments++;
    }

    // Commitment letters: keep history, add only ones not already present.
    for (const c of arr(data.commitments)) {
      const body = str(c.body);
      const createdAt = date(c.createdAt);
      if (!body || !createdAt) continue;
      if (await db.commitment.findFirst({ where: { userId: user.id, body, createdAt } })) continue;
      await db.commitment.create({
        data: { userId: user.id, body, revisit: str(c.revisit) ?? "monthly", createdAt, revisitedAt: date(c.revisitedAt), supersededAt: date(c.supersededAt) ?? new Date() },
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
    return NextResponse.json({ ok: true, counts, message: parts.length ? `Brought in ${parts.join(", ")}.` : "Everything was already here." });
  } catch (error) {
    console.error("Import error:", error);
    return NextResponse.json({ error: "Import failed. Check that it's an ana export file." }, { status: 500 });
  }
}
