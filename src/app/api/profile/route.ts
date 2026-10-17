import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** What the Profile's "This month" row is counted from, for the caller's local month (?date=YYYY-MM-DD). */
export async function GET(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const [y, m] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const [dailies, weeklies, moments, logs] = await Promise.all([
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { answers: true, stamps: true, moodKey: true } }),
    db.weeklyReflection.count({ where: { userId: user.id, weekStart: { gte: start, lt: end } } }),
    db.expression.count({ where: { userId: user.id, OR: [{ occurredAt: { gte: start, lt: end } }, { occurredAt: null, date: { gte: start, lt: end } }] } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { entries: true } }),
  ]);

  // Reflections and logs are sealed: the device counts the days that have something in them.
  return NextResponse.json({
    memberSince: user.createdAt.toISOString(),
    month: { dailies, weekly: weeklies, expressions: moments, logs },
  });
}
