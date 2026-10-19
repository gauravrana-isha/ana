"use client";

import { cn } from "@/lib/utils";
import { Cell, MOODS, MOOD_FILL, Section, fmtDay, type InsightsData } from "../insights-kit";

/** Reflection in Insights: the mood of the last eight weeks. */
export function ReflectionInsights({ data }: { data: InsightsData }) {
  return <MoodWeeks mood={data.mood} />;
}

function MoodWeeks({ mood }: { mood: InsightsData["mood"] }) {
  const logged = mood.filter((m) => m.level !== null);
  // Align to Monday-first weeks.
  const firstDow = (new Date(mood[0].date + "T12:00:00").getDay() + 6) % 7;
  const cells: (InsightsData["mood"][number] | null)[] = [...Array(firstDow).fill(null), ...mood];
  const weeks: typeof cells[] = [];
  for (let i = 0; i < cells.length; i += 7) weeks.push(cells.slice(i, i + 7));

  return (
    <Section title="Mood, the last eight weeks">
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

