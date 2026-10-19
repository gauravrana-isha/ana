"use client";

import Link from "next/link";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { formatTime12 } from "@/components/ui/pickers";
import { cn } from "@/lib/utils";
import { Cell, MOODS, Section, fmtDay, type InsightsData } from "../insights-kit";

/** Sadhana in Insights: each practice's month, the daily rhythm, and (with Reflection) practice and mood together. */
export function SadhanaInsights({ data, withReflection }: { data: InsightsData; withReflection: boolean }) {
  return (
    <>
      <MonthWeave data={data} />
      {data.rhythm.length > 0 && <Rhythm rows={data.rhythm} />}
      {withReflection && <Together rows={data.together} />}
    </>
  );
}

function MonthWeave({ data }: { data: InsightsData }) {
  const { days, todayIndex, label } = data.month;
  if (data.practices.length === 0) {
    return (
      <Section title={label}>
        <Link href="/sadhana" className="block rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft hover:bg-surface-2">
          Add your practices in Sadhana and their month will appear here.
        </Link>
      </Section>
    );
  }
  return (
    <Section title={label}>
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

function moodWord(avg: number) {
  return MOODS[Math.round(Math.max(0, Math.min(4, avg)))].toLowerCase();
}

function Together({ rows }: { rows: InsightsData["together"] }) {
  return (
    <Section title="Practice and mood together">
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

const SCALE_WORD: Record<string, string> = { low: "Low", steady: "Medium", high: "High" };

function Rhythm({ rows }: { rows: InsightsData["rhythm"] }) {
  return (
    <Section title="Daily rhythm">
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
