"use client";

import Link from "next/link";
import { useCallback, useMemo } from "react";
import { ListSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { PracticeRow } from "@/components/tracker/PracticeRow";
import { useDayLog, usePractices, useUpdateDayLog } from "@/lib/queries";
import { isKept } from "@/lib/practiceDefaults";
import type { DayLogEntries, DayLogEntry } from "@/lib/types";
import { SectionHead, type HomeCard, type HomeContext } from "../kit";

/** Today's practices, tickable from Home. */
function TodaysPractices({ date }: HomeContext) {
  const { data: practices = [], isPending: isLoading } = usePractices();
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
          <Link href="/sadhana" className="font-ui text-[13px] font-semibold text-accent hover:underline tabular">
            {practices.length ? `${kept} of ${practices.length} · Open Sadhana` : "Open Sadhana"}
          </Link>
        }
      />
      {isLoading ? (
        <ListSkeleton kind="practice" count={5} />
      ) : practices.length === 0 ? (
        <Link href="/sadhana" className="block rounded-[16px] bg-surface p-4 font-ui text-[14px] text-ink-soft hover:bg-surface-2">
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

export const sadhanaHome: HomeCard[] = [{ key: "practices", order: 30, Card: TodaysPractices }];
