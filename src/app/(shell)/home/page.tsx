"use client";

import Link from "next/link";
import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useHydrated } from "@/lib/hydrated";
import { TodaySkeleton } from "@/components/skeletons/ScreenSkeletons";
import { Ornament } from "@/components/art/Ornament";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { Arrow } from "@/components/ui/Arrows";
import { LazyMomentComposer } from "@/components/moments/LazyMomentComposer";
import { TodaySearchBar } from "@/components/shell/Search";
import { useBundles } from "@/components/shell/Bundles";
import { useNavPlan } from "@/components/shell/BundleNav";
import { homeCardsOf } from "@/bundles/parts";
import { SectionHead } from "@/bundles/kit";
import { SECTIONS } from "@/lib/bundles";
import { useQuote } from "@/lib/queries";
import { callName, useMe } from "@/lib/me";
import type { Moment, MomentKind } from "@/lib/moment-types";
import { today as todayStr } from "@/lib/dates";
import { fetchToday } from "@/lib/journal";

function greeting(first: string | null | undefined) {
  const h = new Date().getHours();
  const part = h < 5 ? "Still night" : h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
  return first ? `${part}, ${first}` : part;
}

/**
 * Home: search, the bell and your picture, the day's quote, then what each of your bundles
 * brings to the day (their cards, in a calm order), and the bundles not in the tab bar.
 */
export default function HomePage() {
  const date = todayStr();
  const { data: me } = useMe();
  const hydrated = useHydrated();
  const bundles = useBundles();
  const { plan } = useNavPlan();
  const { data: quoteData } = useQuote(date);

  const { data, isPending } = useQuery({
    queryKey: ["today", date],
    queryFn: () => fetchToday(date),
  });

  const [composer, setComposer] = useState<{ open: boolean; moment: Moment | null; kind: MomentKind }>({ open: false, moment: null, kind: "writing" });
  const context = {
    date,
    today: data,
    loading: isPending,
    newMoment: (k: MomentKind) => setComposer({ open: true, moment: null, kind: k }),
    editMoment: (m: Moment) => setComposer({ open: true, moment: m, kind: m.kind }),
  };

  if (!hydrated || !me) return <TodaySkeleton />;

  return (
    <div className="flex flex-col gap-8">
      <div className="flex flex-col gap-5">
        <TodaySearchBar />
        <p className="font-serif italic text-[17px] text-ink-soft">{greeting(callName(me))}</p>
      </div>

      {quoteData?.quote && (
        <figure className="relative rounded-[22px] bg-surface px-5 py-6 sm:px-8 sm:py-8 overflow-hidden">
          <Ornament name="leaves" width={300} className="absolute -right-16 -top-8 text-ink-soft/10 hidden sm:block" />
          <blockquote className="relative font-display italic text-[20px] sm:text-[24px] leading-[1.45] text-ink max-w-[36ch]">&ldquo;{quoteData.quote}&rdquo;</blockquote>
        </figure>
      )}

      {homeCardsOf(bundles).map(({ key, Card }) => (
        <Card key={key} {...context} />
      ))}

      {/* Bundles beyond the four in the tab bar open from here. */}
      {plan.offBar.length > 0 && (
        <section aria-label="Your other bundles">
          <SectionHead title="Also yours" />
          <ul className="flex flex-col gap-2">
            {plan.offBar.map((b) => (
              <li key={b.key}>
                <Link href={SECTIONS[b.sections[0]].href} className="press group flex items-center gap-4 rounded-[20px] bg-surface p-4 hover:bg-surface-2 transition-colors">
                  <FeatureBadge k={b.mark} size={44} />
                  <span className="flex-1 min-w-0">
                    <span className="block font-display text-[17px] font-semibold text-ink">{b.label}</span>
                    <span className="block font-ui text-[13px] text-ink-soft truncate">{b.description}</span>
                  </span>
                  <Arrow size={18} className="text-ink-soft group-hover:text-ink transition-colors" />
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Ornament name="divider" width={220} className="mx-auto mt-2 text-ink-soft/35" />

      <LazyMomentComposer open={composer.open} moment={composer.moment} defaultKind={composer.kind} onClose={() => setComposer((c) => ({ ...c, open: false }))} />
    </div>
  );
}
