"use client";

import Link from "next/link";
import { PersonAvatar } from "@/components/people/People";
import { Section, type InsightsData } from "../insights-kit";

/** Expressions in Insights: who and what has been most present in your moments. */
export function ExpressionsInsights({ data }: { data: InsightsData }) {
  return <PeopleBars rows={data.people} />;
}

function PeopleBars({ rows }: { rows: InsightsData["people"] }) {
  const max = Math.max(1, ...rows.map((r) => r.count));
  return (
    <Section title="Most present · last 3 months">
      {rows.length === 0 ? (
        <p className="rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft">Add who or what was with you to your moments, and they&rsquo;ll appear here.</p>
      ) : (
        <ul className="rounded-[20px] bg-surface p-4 sm:p-5 flex flex-col gap-3">
          {rows.map((r) => (
            <li key={r.id}>
              <Link href={`/presence/${r.id}`} className="group grid grid-cols-[auto_minmax(0,9rem)_1fr_auto] items-center gap-3 rounded-[10px]">
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

