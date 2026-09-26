import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { momentInclude, serializeMoment } from "@/lib/moments";
import { commitmentDue } from "@/lib/commitment";

export const dynamic = "force-dynamic";

const DAILY_PROMPT_COUNT = 7;

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Everything the Today page needs, for the caller's local date (?date=YYYY-MM-DD). */
export async function GET(req: NextRequest) {
  const user = await resolveUser("today");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return NextResponse.json({ error: "Bad date" }, { status: 400 });
  const today = new Date(dateStr + "T00:00:00Z");
  const [yyyy, mm, dd] = dateStr.split("-").map(Number);
  const has = (f: Parameters<typeof user.effective.includes>[0]) => user.effective.includes(f);

  const [lookBack, onThisDayRaw, people, daily, commitment] = await Promise.all([
    has("expressions")
      ? db.expression.findMany({
          // Back once its time has come (exact time for newer moments, the day for older ones),
          // and kept here for a week.
          where: {
            userId: user.id,
            OR: [
              { lookBackAt: { gte: addDays(new Date(), -7), lte: new Date() } },
              { lookBackAt: null, lookBackOn: { gte: addDays(today, -7), lte: today } },
            ],
          },
          include: momentInclude,
          orderBy: [{ lookBackOn: "desc" }, { lookBackAt: "desc" }],
          take: 5,
        })
      : [],
    has("expressions")
      ? db.$queryRaw<{ id: string }[]>`
          SELECT id FROM "Expression"
          WHERE "userId" = ${user.id}
            AND EXTRACT(MONTH FROM COALESCE("occurredAt", "date")) = ${mm}
            AND EXTRACT(DAY FROM COALESCE("occurredAt", "date")) = ${dd}
            AND EXTRACT(YEAR FROM COALESCE("occurredAt", "date")) < ${yyyy}
          ORDER BY COALESCE("occurredAt", "date") DESC
          LIMIT 5`
      : [],
    has("people")
      ? db.person.findMany({ where: { userId: user.id, birthday: { not: null } }, select: { id: true, name: true, photoId: true, birthday: true } })
      : [],
    has("daily") ? db.dailyReflection.findUnique({ where: { userId_date: { userId: user.id, date: today } } }) : null,
    has("commitment") ? db.commitment.findFirst({ where: { userId: user.id, supersededAt: null } }) : null,
  ]);

  const onThisDay = onThisDayRaw.length
    ? await db.expression.findMany({ where: { id: { in: onThisDayRaw.map((r) => r.id) } }, include: momentInclude, orderBy: { occurredAt: "desc" } })
    : [];

  // Birthdays in the coming week, however many years ago they were born.
  const birthdays = people
    .map((p) => {
      const b = p.birthday!;
      let next = new Date(Date.UTC(today.getUTCFullYear(), b.getUTCMonth(), b.getUTCDate()));
      if (next < today) next = new Date(Date.UTC(today.getUTCFullYear() + 1, b.getUTCMonth(), b.getUTCDate()));
      const inDays = Math.round((next.getTime() - today.getTime()) / 86_400_000);
      return { id: p.id, name: p.name, photoId: p.photoId, inDays };
    })
    .filter((p) => p.inDays <= 7)
    .sort((a, b) => a.inDays - b.inDays);

  const answers = (daily?.answers ?? {}) as Record<string, string>;
  const answered = Object.values(answers).filter((v) => typeof v === "string" && v.trim()).length;

  return NextResponse.json({
    lookBack: lookBack.map(serializeMoment),
    onThisDay: onThisDay.map(serializeMoment),
    birthdays,
    commitment: commitment && commitmentDue(commitment) ? { body: commitment.body, createdAt: commitment.createdAt.toISOString() } : null,
    commitmentMissing: has("commitment") && !commitment,
    daily: has("daily") ? { answered, total: DAILY_PROMPT_COUNT, mood: daily?.moodKey ?? null } : null,
  });
}
