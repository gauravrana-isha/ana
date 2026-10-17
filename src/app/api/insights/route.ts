import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { insightsSince } from "@/lib/compute/insights";

export const dynamic = "force-dynamic";

function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/**
 * The rows Insights needs, around the caller's local date (?date=YYYY-MM-DD). They're sealed;
 * the patterns are worked out on the device (lib/compute/insights).
 */
export async function GET(req: NextRequest) {
  const user = await resolveUser("insights");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateStr = req.nextUrl.searchParams.get("date") ?? new Date().toISOString().slice(0, 10);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return NextResponse.json({ error: "Bad date" }, { status: 400 });

  const today = new Date(dateStr + "T00:00:00Z");
  const since = insightsSince(dateStr);
  const [practices, logs, dailies, people] = await Promise.all([
    db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" }, select: { id: true, name: true, iconName: true, catalogId: true, hasDoneToggle: true, fields: true, createdAt: true } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: since, lte: today } }, select: { date: true, entries: true } }),
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: addDays(today, -55), lte: today } }, select: { date: true, moodKey: true } }),
    db.person.findMany({
      where: { userId: user.id },
      select: {
        id: true,
        name: true,
        photoId: true,
        _count: { select: { moments: { where: { expression: { OR: [{ occurredAt: { gte: addDays(today, -90) } }, { occurredAt: null, date: { gte: addDays(today, -90) } }] } } } } },
      },
    }),
  ]);

  return NextResponse.json({
    practices,
    logs,
    dailies,
    people: people.map((p) => ({ id: p.id, name: p.name, photoId: p.photoId, count: p._count.moments })),
    has: { tracker: user.effective.includes("tracker"), daily: user.effective.includes("daily"), people: user.effective.includes("people") },
  });
}
