import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { isKept, isRhythm, withDefaults } from "@/lib/practiceDefaults";

export const dynamic = "force-dynamic";

const MOOD_LEVEL: Record<string, number> = { low: 0, agitated: 1, neutral: 2, content: 3, blissful: 4 };
const MIN_DAYS = 5; // never draw a conclusion from fewer days than this, on either side

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** Patterns for the Insights page, relative to the caller's local date (?date=YYYY-MM-DD). */
export async function GET(req: NextRequest) {
  const user = await resolveUser("insights");
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  const dateStr = req.nextUrl.searchParams.get("date") ?? iso(new Date());
  if (!/^\d{4}-\d{2}-\d{2}$/.test(dateStr)) return NextResponse.json({ error: "Bad date" }, { status: 400 });

  const today = new Date(dateStr + "T00:00:00Z");
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const moodStart = addDays(today, -55); // 8 weeks
  const since = new Date(Math.min(monthStart.getTime(), moodStart.getTime()));

  const [practices, logs, dailies, people] = await Promise.all([
    db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" }, select: { id: true, name: true, iconName: true, catalogId: true, hasDoneToggle: true, fields: true, createdAt: true } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: since, lte: today } }, select: { date: true, entries: true } }),
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: moodStart, lte: today } }, select: { date: true, moodKey: true } }),
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

  const logByDay = new Map(logs.map((l) => [iso(l.date), (l.entries ?? {}) as Record<string, { done?: boolean; values?: Record<string, string | number> }>]));
  const tickable = practices.filter((p) => !isRhythm(p));
  const rhythm = practices.filter((p) => isRhythm(p));
  const moodByDay = new Map(dailies.filter((d) => d.moodKey && d.moodKey in MOOD_LEVEL).map((d) => [iso(d.date), MOOD_LEVEL[d.moodKey!]]));

  // Month grid: one row per practice, one cell per day of the month (future days are null).
  const monthDays = Array.from({ length: daysInMonth }, (_, i) => iso(addDays(monthStart, i)));
  const practiceRows = tickable.map((p) => ({
    id: p.id,
    name: p.name,
    iconName: p.iconName,
    catalogId: p.catalogId,
    days: monthDays.map((d) => (d > dateStr ? null : isKept(p, logByDay.get(d)?.[p.id]))),
  }));

  // Mood: 8 weeks of days, oldest first.
  const mood = Array.from({ length: 56 }, (_, i) => {
    const d = iso(addDays(moodStart, i));
    return { date: d, level: moodByDay.has(d) ? moodByDay.get(d)! : null };
  });

  // Practice and mood together, only where there is enough on both sides.
  const together = tickable
    .map((p) => {
      const withP: number[] = [];
      const without: number[] = [];
      for (const [day, level] of moodByDay) {
        (isKept(p, logByDay.get(day)?.[p.id]) ? withP : without).push(level);
      }
      if (withP.length < MIN_DAYS || without.length < MIN_DAYS) return null;
      const avg = (a: number[]) => a.reduce((s, v) => s + v, 0) / a.length;
      return { name: p.name, withAvg: avg(withP), withoutAvg: avg(without), withDays: withP.length, withoutDays: without.length };
    })
    .filter((x) => x && Math.abs(x.withAvg - x.withoutAvg) >= 0.5)
    .sort((a, b) => Math.abs(b!.withAvg - b!.withoutAvg) - Math.abs(a!.withAvg - a!.withoutAvg))
    .slice(0, 3);

  // Daily rhythm over the month so far: the usual value, defaults filling any gaps.
  const pastDays = monthDays.filter((d) => d <= dateStr);
  const rhythmRows = rhythm.map((p) => {
    const fields = Array.isArray(p.fields) ? (p.fields as { key: string; kind: string }[]) : [];
    const f = fields[0];
    const vals = pastDays.map((d) => withDefaults(p, logByDay.get(d)?.[p.id]?.values)[f.key]).filter((v) => v !== undefined && v !== "");
    let usual: string | number | null = null;
    if (f.kind === "TIME") {
      const mins = vals.map((v) => { const [h, m] = String(v).split(":").map(Number); return h * 60 + m; }).sort((a, b) => a - b);
      const mid = mins[Math.floor(mins.length / 2)];
      usual = mid === undefined ? null : `${String(Math.floor(mid / 60)).padStart(2, "0")}:${String(mid % 60).padStart(2, "0")}`;
    } else {
      const counts = new Map<string, number>();
      vals.forEach((v) => counts.set(String(v), (counts.get(String(v)) ?? 0) + 1));
      usual = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;
    }
    return { id: p.id, name: p.name, iconName: p.iconName, catalogId: p.catalogId, kind: f.kind, usual, days: pastDays.length };
  });

  const peopleRows = people
    .map((p) => ({ id: p.id, name: p.name, photoId: p.photoId, count: p._count.moments }))
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return NextResponse.json({
    month: { label: today.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), days: monthDays, todayIndex: today.getUTCDate() - 1 },
    practices: practiceRows,
    rhythm: rhythmRows,
    mood,
    together,
    people: peopleRows,
    has: { tracker: user.effective.includes("tracker"), daily: user.effective.includes("daily"), people: user.effective.includes("people") },
  });
}
