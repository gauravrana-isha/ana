import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";

export const dynamic = "force-dynamic";

/** Counts for the Profile's "This month" row, for the caller's local month (?date=YYYY-MM-DD). */
export async function GET(req: NextRequest) {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  const [y, m] = dateStr.split("-").map(Number);
  const start = new Date(Date.UTC(y, m - 1, 1));
  const end = new Date(Date.UTC(y, m, 1));

  const [dailies, weeklies, moments, logs] = await Promise.all([
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { answers: true, moodKey: true } }),
    db.weeklyReflection.count({ where: { userId: user.id, weekStart: { gte: start, lt: end } } }),
    db.expression.count({ where: { userId: user.id, OR: [{ occurredAt: { gte: start, lt: end } }, { occurredAt: null, date: { gte: start, lt: end } }] } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: start, lt: end } }, select: { entries: true } }),
  ]);

  const answeredDays = dailies.filter((d) => d.moodKey || Object.values((d.answers ?? {}) as Record<string, string>).some((v) => typeof v === "string" && v.trim())).length;
  const practiceDays = logs.filter((l) =>
    Object.values((l.entries ?? {}) as Record<string, { done?: boolean; values?: Record<string, unknown> }>).some(
      (e) => e?.done || Object.values(e?.values ?? {}).some((v) => v !== "" && v !== 0 && v != null)
    )
  ).length;

  return NextResponse.json({
    memberSince: user.createdAt.toISOString(),
    month: { daily: answeredDays, weekly: weeklies, expressions: moments, tracker: practiceDays },
  });
}
