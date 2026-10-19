"use client";

import Link from "next/link";
import { MomentBadge } from "@/components/art/MomentIcon";
import { Glyph } from "@/components/art/Glyphs";
import { PersonAvatar } from "@/components/people/People";
import { MomentCard } from "@/components/moments/MomentCard";
import { ListSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { SectionHead, type HomeCard, type HomeContext } from "../kit";

function yearsAgo(iso: string) {
  const n = new Date().getFullYear() - new Date(iso).getFullYear();
  return n <= 1 ? "A year ago today" : `${n} years ago today`;
}

/** Keep a moment: write, record or add a photo, straight from Home. */
function KeepAMoment({ newMoment }: HomeContext) {
  return (
    <section>
      <SectionHead title="Keep a moment" />
      <div className="grid grid-cols-4 gap-2">
        {(
          [
            ["writing", "Write"],
            ["audio", "Voice"],
            ["video", "Video"],
            ["photo", "Photo"],
          ] as const
        ).map(([k, label]) => (
          <button key={k} type="button" onClick={() => newMoment(k)} className="press group flex flex-col items-center justify-center gap-2 h-[96px] rounded-[18px] bg-surface hover:bg-surface-2 text-ink transition-colors">
            <MomentBadge kind={k} size={44} className="transition-transform duration-200 group-hover:-translate-y-0.5" />
            <span className="font-ui text-[13px] font-semibold">{label}</span>
          </button>
        ))}
      </div>
    </section>
  );
}

/** Birthdays this week, from the people in Presence. */
function Birthdays({ today }: HomeContext) {
  if (!today?.birthdays.length) return null;
  return (
    <section>
      <SectionHead title="Birthdays this week" />
      <ul className="flex flex-col gap-2">
        {today.birthdays.map((p) => (
          <li key={p.id}>
            <Link href={`/presence/${p.id}`} className="press flex items-center gap-3 p-3 rounded-[16px] bg-surface hover:bg-surface-2">
              <PersonAvatar person={p} size={40} />
              <span className="flex-1 font-ui text-[15px] font-semibold text-ink">{p.name}</span>
              <span className="inline-flex items-center gap-1.5 font-ui text-[13px] font-semibold text-saffron">
                <Glyph k="cake" size={18} /> {p.inDays === 0 ? "Today" : p.inDays === 1 ? "Tomorrow" : `In ${p.inDays} days`}
              </span>
            </Link>
          </li>
        ))}
      </ul>
    </section>
  );
}

/** Moments coming back to you (as asked when they were kept). */
function ComingBack({ today, loading, editMoment }: HomeContext) {
  if (loading) return <ListSkeleton kind="moment" count={1} />;
  if (!today?.lookBack.length) return null;
  return (
    <section>
      <SectionHead title="Coming back to you" icon={<Glyph k="returns" size={18} />} />
      <div className="flex flex-col gap-2.5">
        {today.lookBack.map((m) => (
          <MomentCard key={m.id} moment={m} onEdit={editMoment} />
        ))}
      </div>
    </section>
  );
}

/** On this day, in years before. */
function OnThisDay({ today, editMoment }: HomeContext) {
  if (!today?.onThisDay.length) return null;
  return (
    <section>
      <SectionHead title="On this day" />
      <div className="flex flex-col gap-2.5">
        {today.onThisDay.map((m) => (
          <div key={m.id}>
            <p className="font-ui text-[12.5px] font-semibold text-accent mb-1.5 px-1">{yearsAgo(m.occurredAt)}</p>
            <MomentCard moment={m} onEdit={editMoment} />
          </div>
        ))}
      </div>
    </section>
  );
}

export const expressionsHome: HomeCard[] = [
  { key: "keep", order: 20, Card: KeepAMoment },
  { key: "birthdays", order: 60, Card: Birthdays },
  { key: "coming-back", order: 70, Card: ComingBack },
  { key: "on-this-day", order: 80, Card: OnThisDay },
];
