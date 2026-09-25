"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Ornament } from "@/components/art/Ornament";
import { Loader } from "@/components/ui/Loader";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { PersonAvatar } from "@/components/people/People";
import { today as todayStr } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { formatTime12 } from "@/components/ui/pickers";

interface InsightsData {
  month: { label: string; days: string[]; todayIndex: number };
  practices: { id: string; name: string; iconName: string; catalogId: string | null; days: (boolean | null)[] }[];
  rhythm: { id: string; name: string; iconName: string; catalogId: string | null; kind: string; usual: string | null; days: number }[];
  mood: { date: string; level: number | null }[];
  together: { name: string; withAvg: number; withoutAvg: number; withDays: number; withoutDays: number }[];
  people: { id: string; name: string; photoId: string | null; count: number }[];
  has: { tracker: boolean; daily: boolean; people: boolean };
}

const MOODS = ["Low", "Agitated", "Neutral", "Content", "Blissful"];
// One hue, light → dark: the theme's teal mixed into the card surface. Lightness steps
// monotonically in both themes (in dark mode more teal reads lighter, the flipped anchor).
const MOOD_FILL = [20, 40, 60, 80, 100].map((p) => `color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`);

function fmtDay(iso: string) {
  return new Date(iso + "T12:00:00").toLocaleDateString(undefined, { weekday: "short", day: "numeric", month: "short" });
}

export default function InsightsPage() {
  const date = todayStr();
  const { data, isLoading } = useQuery({
    queryKey: ["insights", date],
    queryFn: async (): Promise<InsightsData> => (await fetch(`/api/insights?date=${date}`)).json(),
  });

  if (isLoading || !data) return <div className="py-20 grid place-items-center"><Loader /></div>;

  return (
    <div className="flex flex-col gap-10">
      <p className="-mt-3 font-serif italic text-[16.5px] text-ink-soft max-w-[52ch]">
        Patterns, not scores. Nothing here is a grade; it&rsquo;s a way of seeing how the days have been.
      </p>

      {data.has.tracker && <MonthWeave data={data} />}
      {data.has.tracker && data.rhythm.length > 0 && <Rhythm rows={data.rhythm} />}
      {data.has.daily && <MoodWeeks mood={data.mood} />}
      {data.has.tracker && data.has.daily && <Together rows={data.together} />}
      {data.has.people && <PeopleBars rows={data.people} />}

      <Ornament name="divider" width={220} className="mx-auto text-ink-soft/35" />
    </div>
  );
}

function Section({ title, lead, children }: { title: string; lead?: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="font-display text-[20px] font-semibold text-ink">{title}</h2>
      {lead && <p className="font-ui text-[13.5px] text-ink-soft mt-1 max-w-[60ch]">{lead}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

/** A cell with a hover/focus tooltip. */
function Cell({ label, className, style }: { label: string; className?: string; style?: React.CSSProperties }) {
  return (
    <span tabIndex={0} role="img" aria-label={label} className={cn("group relative block outline-none focus-visible:ring-2 focus-visible:ring-accent", className)} style={style}>
      {/* Kept out of layout until shown, so edge cells never widen the page. */}
      <span className="ana-tip pointer-events-none absolute bottom-[calc(100%+6px)] left-1/2 -translate-x-1/2 z-10 hidden group-hover:block group-focus-visible:block whitespace-nowrap rounded-[8px] bg-ink text-bg px-2 py-1 font-ui text-[12px] font-medium">
        {label}
      </span>
    </span>
  );
}

function MonthWeave({ data }: { data: InsightsData }) {
  const { days, todayIndex, label } = data.month;
  if (data.practices.length === 0) {
    return (
      <Section title={label}>
        <Link href="/tracker" className="block rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft hover:bg-surface-2">
          Add your practices in the tracker and their month will appear here.
        </Link>
      </Section>
    );
  }
  return (
    <Section title={label} lead="Each square is a day you kept the practice. Blank days are simply days.">
      <div className="rounded-[20px] bg-surface p-4 sm:p-5 flex flex-col gap-4">
        {data.practices.map((p) => {
          const keptDays = p.days.filter(Boolean).length;
          const past = p.days.filter((d) => d !== null).length;
          return (
            <div key={p.id} className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4">
              <div className="flex items-center gap-2.5 sm:w-[190px] shrink-0 min-w-0">
                <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={26} />
                <span className="font-ui text-[14px] font-semibold text-ink truncate">{p.name}</span>
                <span className="sm:hidden ml-auto font-ui text-[12.5px] text-ink-soft tabular">{keptDays} of {past} days</span>
              </div>
              <div className="flex-1 grid gap-[2px]" style={{ gridTemplateColumns: `repeat(${days.length}, minmax(0, 1fr))` }} aria-label={`${p.name}: kept ${keptDays} of ${past} days so far this month`}>
                {p.days.map((k, i) => (
                  <Cell
                    key={days[i]}
                    label={`${fmtDay(days[i])} · ${k === null ? "still to come" : k ? "kept" : "not logged"}`}
                    className={cn(
                      "aspect-[3/4] rounded-[3px]",
                      k === null ? "border border-dashed border-line" : k ? "bg-accent" : "bg-surface-2",
                      i === todayIndex && "ring-1 ring-offset-1 ring-offset-surface ring-ink-soft/60"
                    )}
                  />
                ))}
              </div>
              <span className="hidden sm:block w-[92px] text-right font-ui text-[12.5px] text-ink-soft tabular">{keptDays} of {past} days</span>
            </div>
          );
        })}
      </div>
    </Section>
  );
}

function MoodWeeks({ mood }: { mood: InsightsData["mood"] }) {
  const logged = mood.filter((m) => m.level !== null);
  // Align to Monday-first weeks.
  const firstDow = (new Date(mood[0].date + "T12:00:00").getDay() + 6) % 7;
  const cells: (InsightsData["mood"][number] | null)[] = [...Array(firstDow).fill(null), ...mood];
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <Section title="Mood, the last eight weeks" lead={logged.length ? "From the mood you mark at the end of each daily reflection." : "Mark how you feel at the end of the daily reflection and it will gather here."}>
      <div className="rounded-[20px] bg-surface p-4 sm:p-5">
        <div className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-[3px] max-w-[420px]">
          <span />
          <div className="grid grid-cols-7 gap-[3px] mb-1">
            {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
              <span key={i} className="text-center font-ui text-[11px] font-semibold text-ink-soft">{d}</span>
            ))}
          </div>
          {weeks.map((w, wi) => (
            <div key={wi} className="contents">
              <span className="font-ui text-[11.5px] text-ink-soft tabular self-center whitespace-nowrap">
                {w.find(Boolean) ? new Date(w.find(Boolean)!.date + "T12:00:00").toLocaleDateString(undefined, { day: "numeric", month: "short" }) : ""}
              </span>
              <div className="grid grid-cols-7 gap-[3px]">
                {w.map((m, di) =>
                  m ? (
                    <Cell
                      key={m.date}
                      label={`${fmtDay(m.date)} · ${m.level === null ? "not marked" : MOODS[m.level]}`}
                      className={cn("aspect-square rounded-[6px]", m.level === null && "bg-bg")}
                      style={m.level !== null ? { background: MOOD_FILL[m.level] } : undefined}
                    />
                  ) : (
                    <span key={`e${di}`} />
                  )
                )}
              </div>
            </div>
          ))}
        </div>
        {/* Legend: every level named, so colour is never the only key. */}
        <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-1.5" aria-label="Mood scale">
          {MOODS.map((label, i) => (
            <span key={label} className="inline-flex items-center gap-1.5 font-ui text-[12.5px] text-ink-soft">
              <span className="w-3.5 h-3.5 rounded-[4px]" style={{ background: MOOD_FILL[i] }} /> {label}
            </span>
          ))}
          <span className="inline-flex items-center gap-1.5 font-ui text-[12.5px] text-ink-soft">
            <span className="w-3.5 h-3.5 rounded-[4px] bg-bg border border-line" /> Not marked
          </span>
        </div>
        <p className="sr-only">
          {logged.length} of 56 days have a mood. {MOODS.map((l, i) => `${l}: ${logged.filter((m) => m.level === i).length} days`).join(", ")}.
        </p>
      </div>
    </Section>
  );
}

function moodWord(avg: number) {
  return MOODS[Math.round(Math.max(0, Math.min(4, avg)))].toLowerCase();
}

function Together({ rows }: { rows: InsightsData["together"] }) {
  return (
    <Section title="Practice and mood together" lead="Only shown when there are at least five days on each side. A pattern to notice, not a rule.">
      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft">Not enough days yet to notice anything. Keep going gently.</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {rows.map((r) => {
            const brighter = r.withAvg > r.withoutAvg;
            return (
              <li key={r.name} className="rounded-[16px] bg-surface p-4">
                <p className="font-serif text-[16.5px] leading-[1.55] text-ink">
                  On days with <strong className="font-semibold">{r.name}</strong>, you tended to feel{" "}
                  <em>{moodWord(r.withAvg)}</em>; on days without it, more often <em>{moodWord(r.withoutAvg)}</em>.
                </p>
                <p className="font-ui text-[12.5px] text-ink-soft mt-1 tabular">
                  {brighter ? "Brighter with it" : "Brighter without it"} · {r.withDays} days with, {r.withoutDays} without
                </p>
              </li>
            );
          })}
        </ul>
      )}
    </Section>
  );
}

function PeopleBars({ rows }: { rows: InsightsData["people"] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Section title="Moments with people" lead="The last three months.">
      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft">Tag people on your moments and they&rsquo;ll appear here.</p>
      ) : (
        <ul className="rounded-[20px] bg-surface p-4 sm:p-5 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/people/${r.id}`} className="group grid grid-cols-[auto_minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-[10px]">
                <PersonAvatar person={r} size={30} />
                <span className="font-ui text-[14px] font-semibold text-ink truncate group-hover:underline">{r.name}</span>
                <span className="h-2 rounded-full bg-surface-2 overflow-hidden" aria-hidden="true">
                  <span className="block h-full rounded-full bg-accent" style={{ width: `${(r.count / max) * 100}%` }} />
                </span>
                <span className="font-ui text-[13px] text-ink-soft tabular w-[4.5rem] text-right">
                  {r.count} moment{r.count === 1 ? "" : "s"}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Section>
  );
}

const SCALE_WORD: Record<string, string> = { low: "Low", steady: "Medium", high: "High" };

function Rhythm({ rows }: { rows: InsightsData["rhythm"] }) {
  return (
    <Section title="Daily rhythm" lead="Your usual this month. Days you didn't change it count at their default.">
      <ul className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-3 rounded-[18px] bg-surface p-4">
            <PracticeIcon name={r.name} iconName={r.iconName} catalogId={r.catalogId} size={36} />
            <span className="min-w-0">
              <span className="block font-ui text-[13px] text-ink-soft truncate">{r.name}</span>
              <span className="block font-display text-[20px] font-semibold text-ink tabular">
                {r.usual ? (r.kind === "TIME" ? formatTime12(r.usual) : SCALE_WORD[r.usual] ?? r.usual) : "–"}
              </span>
            </span>
          </li>
        ))}
      </ul>
    </Section>
  );
}
