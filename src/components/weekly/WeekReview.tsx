"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Camera, Feather, Microphone, VideoCamera } from "@phosphor-icons/react";
import { Ornament } from "@/components/art/Ornament";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { Loader } from "@/components/ui/Loader";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { PersonAvatar } from "@/components/people/People";
import { today } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { WeekBars, WeekGrid } from "./WeekCharts";

interface Review {
  days: string[];
  today: string;
  practices: { id: string; name: string; iconName: string; catalogId: string | null; cells: (string | null)[]; kept: number; minutes: number }[];
  rhythm: { id: string; name: string; iconName: string; catalogId: string | null; usual: string | null }[];
  sleep: string | null;
  sleepByNight: (number | null)[];
  minutesByDay: (number | null)[];
  mood: { date: string; level: number | null; future: boolean }[];
  reflection: { days: number; of: number; weeklyDone: boolean };
  moments: { id: string; title: string; kind: string; at: string }[];
  momentCount: number;
  people: { id: string; name: string; photoId: string | null; count: number }[];
  noticing: string | null;
  has: { tracker: boolean; daily: boolean; expressions: boolean; people: boolean };
}

const DAY = ["Su", "M", "Tu", "W", "Th", "F", "Sa"];
const MOODS = ["Low", "Agitated", "Neutral", "Content", "Blissful"];
const MOOD_FILL = [20, 40, 60, 80, 100].map((p) => `color-mix(in srgb, var(--accent) ${p}%, var(--surface-2))`);
const KIND_ICON: Record<string, typeof Feather> = { writing: Feather, moment: Feather, audio: Microphone, video: VideoCamera, photo: Camera };

function Card({ title, lead, children, className }: { title: string; lead?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={cn("rounded-[20px] bg-surface p-4 sm:p-5", className)}>
      <h3 className="font-display text-[18px] font-semibold text-ink">{title}</h3>
      {lead && <p className="font-ui text-[13px] text-ink-soft mt-0.5">{lead}</p>}
      <div className="mt-3.5">{children}</div>
    </section>
  );
}

/** This week's story, next to the weekly reflection. Patterns, never scores. */
export function WeekReview({ weekStart, weekRange }: { weekStart: string; weekRange: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ["week-review", weekStart],
    queryFn: async (): Promise<Review> => (await fetch(`/api/digest/${weekStart}?today=${today()}`)).json(),
  });

  if (isLoading) return <div className="py-16 grid place-items-center"><Loader /></div>;
  if (!data || !Array.isArray(data.practices)) {
    return <p className="rounded-[20px] bg-surface p-5 font-ui text-[14px] text-ink-soft">Couldn&rsquo;t load this week. Pull to refresh, or try again in a moment.</p>;
  }

  const anything = data.practices.some((p) => p.kept) || data.momentCount > 0 || data.reflection.days > 0;

  return (
    <div className="flex flex-col gap-3.5">
      <header className="rounded-[20px] bg-surface p-5 sm:p-6 relative overflow-hidden">
        <Ornament name="leaves" width={280} className="absolute -right-16 -bottom-10 text-ink-soft/10 hidden sm:block" />
        <p className="font-ui text-[13px] font-semibold text-ink-soft">Your week</p>
        <h2 className="font-display text-[26px] font-semibold text-ink tabular leading-tight mt-0.5">{weekRange}</h2>
        <p className="font-serif italic text-[16.5px] leading-[1.55] text-ink-soft mt-2 max-w-[48ch] relative">
          {data.noticing ?? "Nothing logged yet this week. It will gather here as the days go."}
        </p>
        {data.has.daily && (
          <div className="mt-4 flex flex-wrap gap-x-6 gap-y-2 font-ui text-[13.5px] text-ink relative">
            <span className="inline-flex items-center gap-2"><FeatureBadge k="daily" size={26} /> Reflected on {data.reflection.days} of {data.reflection.of} days</span>
            <span className="inline-flex items-center gap-2"><FeatureBadge k="weekly" size={26} /> {data.reflection.weeklyDone ? "Weekly reflection written" : "Weekly reflection still open"}</span>
          </div>
        )}
      </header>

      {data.has.tracker && data.practices.length > 0 && (
        <Card title="Practices" lead="A filled day is a day you kept it. Hover or tap for what you logged.">
          <WeekGrid
            days={data.days}
            today={data.today}
            rows={data.practices}
            renderIcon={(id) => {
              const p = data.practices.find((x) => x.id === id)!;
              return <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={24} />;
            }}
          />
        </Card>
      )}

      {data.has.tracker && (data.minutesByDay.some((v) => v) || data.sleepByNight.some((v) => v)) && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
          {data.minutesByDay.some((v) => v) && (
            <Card title="Time in practice" lead={`${data.minutesByDay.reduce<number>((a, v) => a + (v ?? 0), 0)} minutes this week.`}>
              <WeekBars days={data.days} today={data.today} values={data.minutesByDay} format={(v) => `${Math.round(v)}m`} label="Practice minutes each day" />
            </Card>
          )}
          {data.sleepByNight.some((v) => v) && (
            <Card title="Sleep" lead="From bedtime the night before to waking.">
              <WeekBars
                days={data.days}
                today={data.today}
                values={data.sleepByNight}
                average
                format={(v) => `${Math.floor(v / 60)}h${Math.round(v % 60) ? ` ${String(Math.round(v % 60)).padStart(2, "0")}` : ""}`}
                label="Hours of sleep each night"
              />
            </Card>
          )}
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
        {data.has.tracker && (data.rhythm.length > 0 || data.sleep) && (
          <Card title="Daily rhythm" lead="Your usual this week.">
            <ul className="flex flex-col gap-2.5">
              {data.rhythm.map((r) => (
                <li key={r.id} className="flex items-center gap-3">
                  <PracticeIcon name={r.name} iconName={r.iconName} catalogId={r.catalogId} size={30} />
                  <span className="flex-1 font-ui text-[14px] text-ink-soft">{r.name}</span>
                  <span className="font-display text-[17px] font-semibold text-ink tabular">{r.usual ?? "–"}</span>
                </li>
              ))}

            </ul>
          </Card>
        )}

        {data.has.daily && (
          <Card title="Mood" lead="From the end of each daily reflection.">
            <div className="grid grid-cols-7 gap-1.5">
              {data.mood.map((m) => (
                <div key={m.date} className="flex flex-col items-center gap-1">
                  <span
                    title={m.level !== null ? MOODS[m.level] : m.future ? "" : "Not marked"}
                    aria-label={`${new Date(m.date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long" })}: ${m.level !== null ? MOODS[m.level] : "not marked"}`}
                    className={cn("w-full aspect-square rounded-[8px]", m.level === null && (m.future ? "border border-dashed border-line" : "bg-bg"))}
                    style={m.level !== null ? { background: MOOD_FILL[m.level] } : undefined}
                  />
                  <span className={cn("font-ui text-[11px] font-semibold", m.date === data.today ? "text-accent" : "text-ink-soft")}>{DAY[new Date(m.date + "T12:00:00").getDay()]}</span>
                </div>
              ))}
            </div>
            <div className="mt-3 flex flex-wrap gap-x-2.5 gap-y-1">
              {MOODS.map((l, i) => (
                <span key={l} className="inline-flex items-center gap-1 font-ui text-[11.5px] text-ink-soft">
                  <span className="w-2.5 h-2.5 rounded-[3px]" style={{ background: MOOD_FILL[i] }} /> {l}
                </span>
              ))}
            </div>
          </Card>
        )}
      </div>

      {data.has.expressions && (
        <Card title="Moments" lead={data.momentCount ? `${data.momentCount} kept this week.` : "None kept this week yet."}>
          {data.people.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-3">
              {data.people.map((p) => (
                <Link key={p.id} href={`/people/${p.id}`} className="press inline-flex items-center gap-1.5 h-8 pl-1 pr-3 rounded-full bg-bg hover:bg-surface-2">
                  <PersonAvatar person={p} size={24} />
                  <span className="font-ui text-[13px] font-semibold text-ink">{p.name}</span>
                  {p.count > 1 && <span className="font-ui text-[12px] text-ink-soft tabular">×{p.count}</span>}
                </Link>
              ))}
            </div>
          )}
          {data.moments.length > 0 ? (
            <ul className="flex flex-col gap-1.5">
              {data.moments.map((m) => {
                const Icon = KIND_ICON[m.kind] ?? Feather;
                return (
                  <li key={m.id}>
                    <Link href={`/expressions?open=${m.id}`} className="flex items-center gap-3 p-2 -mx-2 rounded-[12px] hover:bg-bg">
                      <span className="grid place-items-center w-8 h-8 rounded-[10px] bg-bg text-accent shrink-0"><Icon size={16} /></span>
                      <span className="flex-1 font-ui text-[14px] text-ink truncate">{m.title || "Untitled moment"}</span>
                      <span className="font-ui text-[12px] text-ink-soft tabular">{new Date(m.at).toLocaleDateString(undefined, { weekday: "short" })}</span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <Link href="/expressions?new=1" className="font-ui text-[13.5px] font-semibold text-accent">Keep one now</Link>
          )}
        </Card>
      )}

      {!anything && <Ornament name="divider" width={200} className="mx-auto mt-2 text-ink-soft/35" />}
    </div>
  );
}
