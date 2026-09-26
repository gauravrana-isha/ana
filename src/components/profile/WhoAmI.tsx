"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { Arrow } from "@/components/ui/Arrows";
import type { PortraitDTO } from "@/lib/portrait";
import { cn } from "@/lib/utils";
import { PortraitPond } from "./PortraitPond";

export function usePortraits() {
  return useQuery({
    queryKey: ["portraits"],
    queryFn: async (): Promise<PortraitDTO[]> => {
      const res = await fetch("/api/portraits");
      return res.ok ? res.json() : [];
    },
  });
}

export function longDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

/** The profile's "Who am I?": the latest portrait, small, with a way in. */
export function WhoAmICard() {
  const { data: portraits, isLoading } = usePortraits();
  const latest = portraits?.[0] ?? null;

  return (
    <section>
      <h2 className="font-display text-[19px] font-semibold text-ink mb-3">Who am I?</h2>
      <Link href="/profile/who" className="press group flex flex-col sm:flex-row sm:items-center gap-5 rounded-[22px] bg-surface p-4 sm:p-5 hover:bg-surface-2 transition-colors">
        <PortraitPond portrait={latest} maxWidth={380} interactive={false} className={cn("sm:w-[55%] shrink-0", isLoading && "opacity-40")} />
        <div className="flex-1 min-w-0 px-1">
          {latest ? (
            <>
              <p className="font-serif italic text-[17px] leading-[1.55] text-ink">Body, mind, emotion, as you last saw them.</p>
              <p className="font-ui text-[13px] text-ink-soft mt-1.5 tabular">Looked on {longDate(latest.createdAt)}</p>
            </>
          ) : (
            <>
              <p className="font-serif italic text-[17px] leading-[1.55] text-ink">A slow self-portrait in three layers: body, mind, emotion.</p>
              <p className="font-ui text-[13px] text-ink-soft mt-1.5">Not a mood for the day. How you are, these days.</p>
            </>
          )}
          <span className="mt-3 inline-flex items-center gap-1.5 font-ui text-[14px] font-semibold text-accent">
            {latest ? "Look again" : "Begin"} <Arrow size={15} className="transition-transform group-hover:translate-x-0.5" />
          </span>
        </div>
      </Link>
    </section>
  );
}
