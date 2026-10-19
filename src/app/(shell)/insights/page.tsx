"use client";

import { useQuery } from "@tanstack/react-query";
import { InsightsSkeleton } from "@/components/skeletons/ScreenSkeletons";
import { Ornament } from "@/components/art/Ornament";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { BackButton } from "@/components/ui/DetailBar";
import { useBundles } from "@/components/shell/Bundles";
import { PARTS } from "@/bundles/parts";
import type { InsightsData } from "@/bundles/insights-kit";
import { BUNDLES } from "@/lib/bundles";
import { today as todayStr } from "@/lib/dates";
import { fetchInsights } from "@/lib/journal";

/**
 * Insights, reached from Profile: one section for each of your bundles, each under its own
 * name (Sadhana, Reflection, Presence), so it's clear what every pattern is about.
 */
export default function InsightsPage() {
  const date = todayStr();
  const bundles = useBundles();
  const { data, isPending } = useQuery({
    queryKey: ["insights", date],
    queryFn: (): Promise<InsightsData> => fetchInsights(date),
  });

  return (
    <div className="flex flex-col gap-10">
      <div className="lg:hidden -mx-1 -mb-6">
        <BackButton to="/profile" label="Back to Profile" />
      </div>
      {isPending || !data ? (
        <InsightsSkeleton />
      ) : (
        BUNDLES.filter((b) => bundles.includes(b.key)).map((b) => {
          const Part = PARTS[b.key].insights;
          return (
            <section key={b.key} aria-labelledby={`insights-${b.key}`} className="flex flex-col gap-8">
              <h2 id={`insights-${b.key}`} className="flex items-center gap-3 font-display text-[24px] font-semibold tracking-[-0.01em] text-ink">
                <FeatureBadge k={b.mark} size={36} />
                {b.label}
              </h2>
              <Part data={data} bundles={bundles} />
            </section>
          );
        })
      )}
      <Ornament name="divider" width={220} className="mx-auto text-ink-soft/35" />
    </div>
  );
}
