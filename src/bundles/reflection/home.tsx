"use client";

import Link from "next/link";
import { Arrow } from "@/components/ui/Arrows";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { Glyph } from "@/components/art/Glyphs";
import { cn } from "@/lib/utils";
import type { HomeCard, HomeContext } from "../kit";

/** Your sankalpa, when it's time to read it again (near the top: it's for today). */
function SankalpaDue({ today }: HomeContext) {
  if (!today?.commitment) return null;
  return (
    <Link href="/sankalpa" className="press group block rounded-[22px] border border-accent/30 bg-accent-soft p-5 sm:p-6">
      <span className="inline-flex items-center gap-2 font-ui text-[13px] font-semibold text-accent"><Glyph k="words" size={18} /> Your sankalpa · time to read it again</span>
      <p className="mt-2 font-serif text-[17px] leading-[1.65] text-ink line-clamp-3 whitespace-pre-line">{today.commitment.body}</p>
      <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[13.5px] font-semibold text-accent">Read it again <Arrow size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
    </Link>
  );
}

/** Tonight's reflection: answered or not, and how far. */
function DailyReflection({ today }: HomeContext) {
  const daily = today?.daily;
  if (!daily) return null;
  return (
    <Link href="/daily" className="press group flex items-center gap-4 rounded-[20px] bg-surface p-4 sm:p-5 hover:bg-surface-2 transition-colors">
      <FeatureBadge k="daily" size={48} />
      <span className="flex-1 min-w-0">
        <span className="block font-display text-[18px] font-semibold text-ink">Daily reflection</span>
        <span className="block font-ui text-[13.5px] text-ink-soft mt-0.5">
          {daily.answered === 0 ? "A few quiet questions, whenever the day settles." : daily.answered >= daily.total ? "All answered today. Thank you." : `${daily.answered} of ${daily.total} answered`}
        </span>
        <span className="mt-2 flex gap-1" aria-hidden="true">
          {Array.from({ length: daily.total }).map((_, i) => (
            <span key={i} className={cn("h-1 flex-1 rounded-full", i < daily.answered ? "bg-accent" : "bg-line")} />
          ))}
        </span>
      </span>
      <Arrow size={18} className="text-ink-soft group-hover:text-ink transition-colors" />
    </Link>
  );
}

/** Until the letter is written, a quiet way to it, after the day's own things. */
function SankalpaMissing({ today }: HomeContext) {
  if (!today?.commitmentMissing) return null;
  return (
    <Link href="/sankalpa" className="press group flex items-center gap-4 rounded-[20px] bg-surface p-4 sm:p-5 hover:bg-surface-2 transition-colors">
      <FeatureBadge k="commitment" size={48} />
      <span className="flex-1 min-w-0">
        <span className="block font-display text-[18px] font-semibold text-ink">Write your sankalpa</span>
      </span>
      <Arrow size={18} className="text-ink-soft group-hover:text-ink transition-colors" />
    </Link>
  );
}

export const reflectionHome: HomeCard[] = [
  { key: "sankalpa-due", order: 10, Card: SankalpaDue },
  { key: "daily", order: 40, Card: DailyReflection },
  { key: "sankalpa-missing", order: 50, Card: SankalpaMissing },
];
