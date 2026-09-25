"use client";

import Link from "next/link";
import { useCallback, useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { ArrowCounterClockwise, Cake, Camera, Feather, Microphone, Scroll, VideoCamera } from "@phosphor-icons/react";
import { Arrow } from "@/components/ui/Arrows";
import { Ornament } from "@/components/art/Ornament";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { Loader } from "@/components/ui/Loader";
import { PracticeRow } from "@/components/tracker/PracticeRow";
import { PersonAvatar } from "@/components/people/People";
import { MomentComposer } from "@/components/moments/MomentComposer";
import { MomentCard } from "@/components/moments/MomentCard";
import { useDayLog, usePractices, useQuote, useUpdateDayLog } from "@/lib/queries";
import { useMe } from "@/lib/me";
import type { Moment, MomentKind } from "@/lib/moment-types";
import type { DayLogEntries, DayLogEntry } from "@/lib/types";
import { today as todayStr } from "@/lib/dates";
import { isKept } from "@/lib/practiceDefaults";
import { cn } from "@/lib/utils";

interface TodayData {
  lookBack: Moment[];
  onThisDay: Moment[];
  birthdays: { id: string; name: string; photoId: string | null; inDays: number }[];
  daily: { answered: number; total: number; mood: string | null } | null;
  commitment?: { body: string; createdAt: string } | null;
  commitmentMissing?: boolean;
}

function greeting(name: string | null | undefined) {
  const h = new Date().getHours();
  const part = h < 5 ? "Still night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  const first = name?.split(" ")[0];
  return first ? `${part}, ${first}` : part;
}

function yearsAgo(iso: string) {
  const n = new Date().getFullYear() - new Date(iso).getFullYear();
  return n <= 1 ? "A year ago today" : `${n} years ago today`;
}

export default function TodayPage() {
  const date = todayStr();
  const { data: me } = useMe();
  const { data: quoteData } = useQuote(date);
  const has = (f: string) => !!me?.features.includes(f as never);

  const { data, isLoading } = useQuery({
    queryKey: ["today", date],
    queryFn: async (): Promise<TodayData> => (await fetch(`/api/today?date=${date}`)).json(),
  });

  const [composer, setComposer] = useState<{ open: boolean; moment: Moment | null; kind: MomentKind }>({ open: false, moment: null, kind: "writing" });
  const openNew = (k: MomentKind) => setComposer({ open: true, moment: null, kind: k });
  const edit = (m: Moment) => setComposer({ open: true, moment: m, kind: m.kind });

  return (
    <div className="flex flex-col gap-8">
      <p className="-mt-3 font-serif italic text-[17px] text-ink-soft">{greeting(me?.name)}.</p>

      {/* The day's quote */}
      {quoteData?.quote && (
        <figure className="relative rounded-[22px] bg-surface px-5 py-6 sm:px-8 sm:py-8 overflow-hidden">
          <Ornament name="leaves" width={300} className="absolute -right-16 -top-8 text-ink-soft/10 hidden sm:block" />
          <blockquote className="relative font-display italic text-[20px] sm:text-[24px] leading-[1.45] text-ink max-w-[36ch]">
            &ldquo;{quoteData.quote}&rdquo;
          </blockquote>
        </figure>
      )}

      {/* The commitment letter, when it's time to read it again */}
      {data?.commitment && (
        <Link href="/commitment" className="press group block rounded-[22px] border border-accent/30 bg-accent-soft p-5 sm:p-6">
          <span className="inline-flex items-center gap-2 font-ui text-[13px] font-semibold text-accent"><Scroll size={16} /> Your commitment · time to read it again</span>
          <p className="mt-2 font-serif text-[17px] leading-[1.65] text-ink line-clamp-3 whitespace-pre-line">{data.commitment.body}</p>
          <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[13.5px] font-semibold text-accent">Read it again <Arrow size={15} className="transition-transform group-hover:translate-x-0.5" /></span>
        </Link>
      )}
      {data?.commitmentMissing && (
        <Link href="/commitment" className="press flex items-center gap-3 rounded-[18px] bg-surface p-4 hover:bg-surface-2">
          <FeatureBadge k="commitment" size={40} />
          <span className="flex-1 font-ui text-[14px] text-ink-soft"><strong className="font-semibold text-ink">Write your commitment.</strong> A letter to yourself that comes back when you choose.</span>
          <Arrow size={16} className="text-ink-soft" />
        </Link>
      )}

      {/* Keep a moment */}
      {has("expressions") && (
        <section>
          <SectionHead title="Keep a moment" />
          <div className="grid grid-cols-4 gap-2">
            {([
              ["writing", "Write", Feather],
              ["audio", "Voice", Microphone],
              ["video", "Video", VideoCamera],
              ["photo", "Photo", Camera],
            ] as const).map(([k, label, Icon]) => (
              <button key={k} type="button" onClick={() => openNew(k)} className="press flex flex-col items-center justify-center gap-2 h-[88px] rounded-[18px] bg-surface hover:bg-surface-2 text-ink">
                <span className="grid place-items-center w-10 h-10 rounded-full bg-accent-soft text-accent"><Icon size={20} /></span>
                <span className="font-ui text-[13px] font-semibold">{label}</span>
              </button>
            ))}
          </div>
        </section>
      )}

      {/* Practices */}
      {has("tracker") && <TodayPractices date={date} />}

      {/* Reflection */}
      {data?.daily && (
        <Link href="/daily" className="press group flex items-center gap-4 rounded-[20px] bg-surface p-4 sm:p-5 hover:bg-surface-2 transition-colors">
          <FeatureBadge k="daily" size={48} />
          <span className="flex-1 min-w-0">
            <span className="block font-display text-[18px] font-semibold text-ink">Daily reflection</span>
            <span className="block font-ui text-[13.5px] text-ink-soft mt-0.5">
              {data.daily.answered === 0
                ? "A few quiet questions, whenever the day settles."
                : data.daily.answered >= data.daily.total
                  ? "All answered today. Thank you."
                  : `${data.daily.answered} of ${data.daily.total} answered`}
            </span>
            <span className="mt-2 flex gap-1" aria-hidden="true">
              {Array.from({ length: data.daily.total }).map((_, i) => (
                <span key={i} className={cn("h-1 flex-1 rounded-full", i < data.daily!.answered ? "bg-accent" : "bg-line")} />
              ))}
            </span>
          </span>
          <Arrow size={18} className="text-ink-soft group-hover:text-ink transition-colors" />
        </Link>
      )}

      {isLoading ? (
        <div className="py-8 grid place-items-center"><Loader size="sm" /></div>
      ) : (
        <>
          {/* Birthdays */}
          {data && data.birthdays.length > 0 && (
            <section>
              <SectionHead title="Birthdays this week" />
              <ul className="flex flex-col gap-2">
                {data.birthdays.map((p) => (
                  <li key={p.id}>
                    <Link href={`/people/${p.id}`} className="press flex items-center gap-3 p-3 rounded-[16px] bg-surface hover:bg-surface-2">
                      <PersonAvatar person={p} size={40} />
                      <span className="flex-1 font-ui text-[15px] font-semibold text-ink">{p.name}</span>
                      <span className="inline-flex items-center gap-1.5 font-ui text-[13px] font-semibold text-saffron">
                        <Cake size={16} /> {p.inDays === 0 ? "Today" : p.inDays === 1 ? "Tomorrow" : `In ${p.inDays} days`}
                      </span>
                    </Link>
                  </li>
                ))}
              </ul>
            </section>
          )}

          {/* Moments coming back */}
          {data && data.lookBack.length > 0 && (
            <section>
              <SectionHead title="Coming back to you" icon={<ArrowCounterClockwise size={16} />} />
              <div className="flex flex-col gap-2.5">
                {data.lookBack.map((m) => <MomentCard key={m.id} moment={m} onEdit={edit} />)}
              </div>
            </section>
          )}

          {/* On this day */}
          {data && data.onThisDay.length > 0 && (
            <section>
              <SectionHead title="On this day" />
              <div className="flex flex-col gap-2.5">
                {data.onThisDay.map((m) => (
                  <div key={m.id}>
                    <p className="font-ui text-[12.5px] font-semibold text-accent mb-1.5 px-1">{yearsAgo(m.occurredAt)}</p>
                    <MomentCard moment={m} onEdit={edit} />
                  </div>
                ))}
              </div>
            </section>
          )}
        </>
      )}

      <Ornament name="divider" width={220} className="mx-auto mt-2 text-ink-soft/35" />

      <MomentComposer open={composer.open} moment={composer.moment} defaultKind={composer.kind} onClose={() => setComposer((c) => ({ ...c, open: false }))} />
    </div>
  );
}

function SectionHead({ title, icon, action }: { title: string; icon?: React.ReactNode; action?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="inline-flex items-center gap-2 font-display text-[19px] font-semibold text-ink">
        {icon && <span className="text-accent">{icon}</span>}
        {title}
      </h2>
      {action}
    </div>
  );
}

function TodayPractices({ date }: { date: string }) {
  const { data: practices = [], isLoading } = usePractices();
  const { data: day } = useDayLog(date);
  const update = useUpdateDayLog(date);
  const entries: DayLogEntries = useMemo(() => day?.entries ?? {}, [day]);

  const handleChange = useCallback(
    (practiceId: string, entry: Partial<DayLogEntry>) => {
      const current = entries[practiceId];
      update.mutate({
        [practiceId]: { done: entry.done ?? current?.done ?? false, values: entry.values ?? current?.values ?? {} },
      });
    },
    [entries, update]
  );

  const kept = practices.filter((p) => isKept(p, entries[p.id])).length;

  return (
    <section>
      <SectionHead
        title="Today's practices"
        action={
          <Link href="/tracker" className="font-ui text-[13px] font-semibold text-accent hover:underline tabular">
            {practices.length ? `${kept} of ${practices.length} · Open tracker` : "Open tracker"}
          </Link>
        }
      />
      {isLoading ? (
        <div className="py-6 grid place-items-center"><Loader size="sm" /></div>
      ) : practices.length === 0 ? (
        <Link href="/tracker" className="block rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft hover:bg-surface-2">
          Add the practices you keep, and tick them here each day.
        </Link>
      ) : (
        <div>
          {practices.map((p) => (
            <PracticeRow key={p.id} practice={p} entry={entries[p.id]} onChange={handleChange} />
          ))}
        </div>
      )}
    </section>
  );
}
