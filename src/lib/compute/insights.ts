import { isKept, isRhythm, withDefaults } from "@/lib/practiceDefaults";

/*
 * Patterns for the Insights page, worked out on the device: practices, logs and moods are
 * sealed, so the server only gathers the rows (by date) and this does the rest.
 */

const MOOD_LEVEL: Record<string, number> = { low: 0, agitated: 1, neutral: 2, content: 3, blissful: 4 };
const MIN_DAYS = 5; // never draw a conclusion from fewer days than this, on either side

type Entries = Record<string, { done?: boolean; values?: Record<string, string | number> }>;

export interface InsightsRaw {
  practices: { id: string; name: string; iconName: string; catalogId: string | null; hasDoneToggle: boolean; fields: unknown; createdAt: string }[];
  logs: { date: string; entries: Entries }[];
  dailies: { date: string; moodKey: string | null }[];
  people: { id: string; name: string; photoId: string | null; count: number }[];
  has: { tracker: boolean; daily: boolean; people: boolean };
}

function iso(d: Date) {
  return d.toISOString().slice(0, 10);
}
function addDays(d: Date, n: number) {
  const x = new Date(d);
  x.setUTCDate(x.getUTCDate() + n);
  return x;
}

/** The first day the server needs rows from, for this local date. */
export function insightsSince(dateStr: string) {
  const today = new Date(dateStr + "T00:00:00Z");
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const moodStart = addDays(today, -55);
  return new Date(Math.min(monthStart.getTime(), moodStart.getTime()));
}

export function computeInsights(raw: InsightsRaw, dateStr: string) {
  const today = new Date(dateStr + "T00:00:00Z");
  const monthStart = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth(), 1));
  const daysInMonth = new Date(Date.UTC(today.getUTCFullYear(), today.getUTCMonth() + 1, 0)).getUTCDate();
  const moodStart = addDays(today, -55); // 8 weeks
  const practices = raw.practices.map((p) => ({ ...p, fields: Array.isArray(p.fields) ? p.fields : [] }));

  const logByDay = new Map(raw.logs.map((l) => [l.date.slice(0, 10), (l.entries ?? {}) as Entries]));
  const tickable = practices.filter((p) => !isRhythm(p));
  const rhythm = practices.filter((p) => isRhythm(p));
  const moodStartIso = iso(moodStart);
  const moodByDay = new Map(
    raw.dailies
      .filter((d) => d.moodKey && d.moodKey in MOOD_LEVEL && d.date.slice(0, 10) >= moodStartIso && d.date.slice(0, 10) <= dateStr)
      .map((d) => [d.date.slice(0, 10), MOOD_LEVEL[d.moodKey!]])
  );

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
    .filter((x): x is NonNullable<typeof x> => !!x && Math.abs(x.withAvg - x.withoutAvg) >= 0.5)
    .sort((a, b) => Math.abs(b.withAvg - b.withoutAvg) - Math.abs(a.withAvg - a.withoutAvg))
    .slice(0, 3);

  // Daily rhythm over the month so far: the usual value, defaults filling any gaps.
  const pastDays = monthDays.filter((d) => d <= dateStr);
  const rhythmRows = rhythm.map((p) => {
    const fields = p.fields as { key: string; kind: string }[];
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

  const peopleRows = raw.people
    .filter((p) => p.count > 0)
    .sort((a, b) => b.count - a.count)
    .slice(0, 8);

  return {
    month: { label: today.toLocaleDateString("en-GB", { month: "long", year: "numeric", timeZone: "UTC" }), days: monthDays, todayIndex: today.getUTCDate() - 1 },
    practices: practiceRows,
    rhythm: rhythmRows,
    mood,
    together,
    people: peopleRows,
    has: raw.has,
  };
}
