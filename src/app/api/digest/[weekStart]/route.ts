import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { addDays } from "@/lib/dates";

export const dynamic = "force-dynamic";

/** The week's rows for its review. Sealed: the review itself is worked out on the device (lib/compute/digest). */
export async function GET(_req: Request, { params }: { params: Promise<{ weekStart: string }> }) {
  const user = await resolveUser("weekly");
  const { weekStart } = await params;
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const start = new Date(weekStart), end = new Date(addDays(weekStart, 7));
  const has = (f: Parameters<typeof user.effective.includes>[0]) => user.effective.includes(f);

  const [practices, logs, dailies, weekly, moments] = await Promise.all([
    db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { date: true, entries: true } }),
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { date: true, answers: true, moodKey: true } }),
    db.weeklyReflection.findUnique({ where: { userId_weekStart: { userId: user.id, weekStart: start } }, select: { answers: true } }),
    has("expressions")
      ? db.expression.findMany({
          where: { userId: user.id, OR: [{ occurredAt: { gte: start, lt: end } }, { occurredAt: null, date: { gte: start, lt: end } }] },
          orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }],
          select: { id: true, title: true, kind: true, occurredAt: true, date: true, people: { select: { person: { select: { id: true, name: true, photoId: true } } } } },
        })
      : [],
  ]);

  return NextResponse.json({
    practices,
    logs,
    dailies,
    weekly,
    moments,
    has: { tracker: has("tracker"), daily: has("daily"), expressions: has("expressions"), people: has("people") },
  });
}
