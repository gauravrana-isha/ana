import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { resolveUser } from "@/lib/session";
import { addDays, computeSleepMinutes } from "@/lib/dates";
import { cellSummary, isKept, specFor, time12, valuesWithDefaults } from "@/lib/practiceSpec";

export const dynamic = "force-dynamic";

const MOOD_LEVEL: Record<string, number> = { low: 0, agitated: 1, neutral: 2, content: 3, blissful: 4 };
const iso = (d: Date) => d.toISOString().slice(0, 10);

function median(xs: number[]) {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}
function hhmm(mins: number) {
  const m = ((Math.round(mins) % 1440) + 1440) % 1440;
  return `${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`;
}
function toMins(t: unknown) {
  if (typeof t !== "string" || !t.includes(":")) return null;
  const [h, m] = t.split(":").map(Number);
  return h * 60 + m;
}

/** The week in review: this week's story, built on the same rules as the tracker. */
export async function GET(req: NextRequest, { params }: { params: Promise<{ weekStart: string }> }) {
  const user = await resolveUser("weekly");
  const { weekStart } = await params;
  if (!user || !/^\d{4}-\d{2}-\d{2}$/.test(weekStart)) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const today = req.nextUrl.searchParams.get("today") ?? iso(new Date());
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const past = days.filter((d) => d <= today);
  const start = new Date(weekStart), end = new Date(addDays(weekStart, 7));
  const has = (f: Parameters<typeof user.effective.includes>[0]) => user.effective.includes(f);

  const [practices, logs, dailies, weekly, moments] = await Promise.all([
    db.practice.findMany({ where: { userId: user.id }, orderBy: { order: "asc" } }),
    db.dayLog.findMany({ where: { userId: user.id, date: { gte: start, lt: end } } }),
    db.dailyReflection.findMany({ where: { userId: user.id, date: { gte: start, lt: end } } }),
    db.weeklyReflection.findUnique({ where: { userId_weekStart: { userId: user.id, weekStart: start } } }),
    has("expressions")
      ? db.expression.findMany({
          where: { userId: user.id, OR: [{ occurredAt: { gte: start, lt: end } }, { occurredAt: null, date: { gte: start, lt: end } }] },
          orderBy: [{ occurredAt: { sort: "desc", nulls: "last" } }],
          select: { id: true, title: true, kind: true, occurredAt: true, date: true, people: { select: { person: { select: { id: true, name: true, photoId: true } } } } },
        })
      : [],
  ]);

  type Entries = Record<string, { done?: boolean; values?: Record<string, string | number> }>;
  const logBy = new Map(logs.map((l) => [iso(l.date), (l.entries ?? {}) as Entries]));

  // Practices: one row each, the day's own value in every cell.
  const rows = practices.filter((p) => p.name !== "Mood").map((p) => ({ p, spec: specFor(p) }));
  const practiceRows = rows
    .filter(({ spec }) => !spec.rhythm)
    .map(({ p, spec }) => {
      const cells = days.map((d) => (d > today ? null : cellSummary(spec, logBy.get(d)?.[p.id])?.text ?? ""));
      const kept = past.filter((d) => isKept(spec, logBy.get(d)?.[p.id])).length;
      const minutes = past.reduce((sum, d) => {
        const v = logBy.get(d)?.[p.id]?.values?.min;
        return sum + (typeof v === "number" ? v : 0);
      }, 0);
      return { id: p.id, name: p.name, iconName: p.iconName, catalogId: p.catalogId, cells, kept, minutes };
    });

  // Rhythm: usual wake and bed times, and average sleep between them.
  const rhythm = rows
    .filter(({ spec }) => spec.rhythm)
    .map(({ p, spec }) => {
      const f = spec.fields[0];
      const vals = past.map((d) => valuesWithDefaults(spec, logBy.get(d)?.[p.id]?.values)[f.key]);
      let usual: string | null = null;
      if (f.kind === "TIME") {
        const m = median(vals.map(toMins).filter((x): x is number => x !== null));
        usual = m === null ? null : time12(hhmm(m));
      } else {
        const counts = new Map<string, number>();
        vals.forEach((v) => v !== undefined && counts.set(String(v), (counts.get(String(v)) ?? 0) + 1));
        const top = [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0];
        usual = top ? (f.labels ?? ["Low", "Medium", "High"])[["low", "steady", "high"].indexOf(top)] ?? top : null;
      }
      return { id: p.id, name: p.name, iconName: p.iconName, catalogId: p.catalogId, usual };
    });

  const wake = rows.find(({ p }) => p.catalogId === "wake-up" || p.name === "Wake up");
  const bed = rows.find(({ p }) => p.catalogId === "bedtime" || p.name === "Bedtime");
  let sleep: string | null = null;
  let sleepByNight: (number | null)[] = days.map(() => null);
  if (wake && bed) {
    sleepByNight = days.map((d) => {
      if (d > today) return null;
      const w = valuesWithDefaults(wake.spec, logBy.get(d)?.[wake.p.id]?.values).time;
      const b = valuesWithDefaults(bed.spec, logBy.get(addDays(d, -1))?.[bed.p.id]?.values).time;
      return typeof w === "string" && typeof b === "string" ? computeSleepMinutes(b, w) : null;
    });
    const nights = past
      .map((d) => {
        const w = valuesWithDefaults(wake.spec, logBy.get(d)?.[wake.p.id]?.values).time;
        const b = valuesWithDefaults(bed.spec, logBy.get(addDays(d, -1))?.[bed.p.id]?.values).time;
        return typeof w === "string" && typeof b === "string" ? computeSleepMinutes(b, w) : null;
      })
      .filter((x): x is number => !!x && x > 0);
    if (nights.length) {
      const avg = nights.reduce((a, b) => a + b, 0) / nights.length;
      sleep = `${Math.floor(avg / 60)}h ${String(Math.round(avg % 60)).padStart(2, "0")}m`;
    }
  }

  // Practice minutes per day, across every practice that logs minutes.
  const minutesByDay = days.map((d) =>
    d > today
      ? null
      : practices.reduce((sum, p) => {
          const v = logBy.get(d)?.[p.id]?.values?.min;
          return sum + (typeof v === "number" ? v : 0);
        }, 0)
  );

  // Mood and reflection, day by day.
  const dailyBy = new Map(dailies.map((d) => [iso(d.date), d]));
  const mood = days.map((d) => {
    const r = dailyBy.get(d);
    return { date: d, level: r?.moodKey && r.moodKey in MOOD_LEVEL ? MOOD_LEVEL[r.moodKey] : null, future: d > today };
  });
  const reflectedDays = dailies.filter(
    (d) => d.moodKey || Object.values((d.answers ?? {}) as Record<string, string>).some((v) => typeof v === "string" && v.trim())
  ).length;
  const weeklyDone = !!weekly && Object.values((weekly.answers ?? {}) as Record<string, string>).some((v) => typeof v === "string" && v.trim());

  // People met this week, most moments first.
  const people = new Map<string, { id: string; name: string; photoId: string | null; count: number }>();
  for (const m of moments) for (const { person } of m.people) {
    const cur = people.get(person.id) ?? { ...person, count: 0 };
    cur.count++;
    people.set(person.id, cur);
  }

  // One gentle line: the steadiest practice, or where the week leaned.
  const steady = [...practiceRows].sort((a, b) => b.kept - a.kept)[0];
  const moodVals = mood.map((m) => m.level).filter((x): x is number => x !== null);
  const noticing =
    steady && steady.kept >= 3
      ? `${steady.name} was your steadiest practice, on ${steady.kept} of ${past.length} days.`
      : moodVals.length >= 3
        ? `You marked your mood on ${moodVals.length} days this week.`
        : practiceRows.some((r) => r.kept) || moments.length
          ? "A quieter week. Whatever you kept, it counts."
          : null;

  return NextResponse.json({
    days,
    today,
    practices: practiceRows,
    rhythm,
    sleep,
    sleepByNight,
    minutesByDay,
    mood,
    reflection: { days: reflectedDays, of: past.length, weeklyDone },
    moments: moments.slice(0, 4).map((m) => ({ id: m.id, title: m.title, kind: m.kind, at: (m.occurredAt ?? m.date).toISOString() })),
    momentCount: moments.length,
    people: [...people.values()].sort((a, b) => b.count - a.count).slice(0, 8),
    noticing,
    has: { tracker: has("tracker"), daily: has("daily"), expressions: has("expressions"), people: has("people") },
  });
}
