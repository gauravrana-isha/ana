import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

function snippet(text: string, q: string, width = 90) {
  const i = text.toLowerCase().indexOf(q.toLowerCase());
  if (i < 0) return text.slice(0, width);
  const start = Math.max(0, i - 30);
  return (start > 0 ? "…" : "") + text.slice(start, start + width).trim() + (start + width < text.length ? "…" : "");
}

function textOf(body: string) {
  try {
    const out: string[] = [];
    const walk = (n: { text?: string; content?: unknown[] }) => {
      if (n.text) out.push(n.text);
      (n.content as { text?: string }[] | undefined)?.forEach(walk);
    };
    walk(JSON.parse(body));
    return out.join(" ");
  } catch {
    return body;
  }
}

/** One search across moments, people and reflections the caller can see. */
export async function GET(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const q = req.nextUrl.searchParams.get("q")?.trim().slice(0, 80) ?? "";
  if (q.length < 2) return NextResponse.json({ moments: [], people: [], reflections: [] });
  const like = `%${q.replace(/[%_\\]/g, (c) => "\\" + c)}%`;
  const has = (f: Parameters<typeof user.effective.includes>[0]) => user.effective.includes(f);
  const contains = { contains: q, mode: "insensitive" as const };

  const [moments, people, daily, weekly] = await Promise.all([
    has("expressions")
      ? db.expression.findMany({
          where: {
            userId: user.id,
            OR: [{ title: contains }, { body: contains }, { place: contains }, { people: { some: { person: { name: contains } } } }],
          },
          orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }, { date: "desc" }],
          take: 6,
          select: { id: true, title: true, body: true, kind: true, occurredAt: true, date: true, place: true },
        })
      : [],
    has("people") || has("expressions")
      ? db.person.findMany({
          where: { userId: user.id, OR: [{ name: contains }, { relation: contains }, { notes: contains }, { howMet: contains }] },
          take: 6,
          select: { id: true, name: true, relation: true, photoId: true },
        })
      : [],
    has("daily")
      ? db.$queryRaw<{ date: Date; answers: Record<string, string> }[]>`
          SELECT "date", "answers" FROM "DailyReflection"
          WHERE "userId" = ${user.id} AND "answers"::text ILIKE ${like}
          ORDER BY "date" DESC LIMIT 6`
      : [],
    has("weekly")
      ? db.$queryRaw<{ weekStart: Date; answers: Record<string, string> }[]>`
          SELECT "weekStart", "answers" FROM "WeeklyReflection"
          WHERE "userId" = ${user.id} AND "answers"::text ILIKE ${like}
          ORDER BY "weekStart" DESC LIMIT 4`
      : [],
  ]);

  const reflections = [
    ...daily.map((d) => {
      const hit = Object.values(d.answers ?? {}).find((v) => typeof v === "string" && v.toLowerCase().includes(q.toLowerCase())) ?? "";
      const date = d.date.toISOString().slice(0, 10);
      return { kind: "daily" as const, date, href: `/daily?date=${date}`, snippet: snippet(hit, q) };
    }),
    ...weekly.map((w) => {
      const hit = Object.values(w.answers ?? {}).find((v) => typeof v === "string" && v.toLowerCase().includes(q.toLowerCase())) ?? "";
      const date = w.weekStart.toISOString().slice(0, 10);
      return { kind: "weekly" as const, date, href: `/weekly?week=${date}`, snippet: snippet(hit, q) };
    }),
  ];

  return NextResponse.json({
    moments: moments.map((m) => {
      const text = textOf(m.body);
      return {
        id: m.id,
        title: m.title || text.slice(0, 60) || (m.kind === "audio" ? "Voice note" : m.kind === "video" ? "Video" : m.kind === "photo" ? "Photos" : "Moment"),
        kind: m.kind,
        at: (m.occurredAt ?? m.date).toISOString(),
        snippet: text.toLowerCase().includes(q.toLowerCase()) ? snippet(text, q) : m.place ?? "",
      };
    }),
    people,
    reflections,
  });
}
