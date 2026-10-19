"use client";

import type { Moment, MomentKind } from "@/lib/moment-types";
import type { TodayData } from "@/lib/journal";

/*
 * What a bundle can bring to the screens everyone has. Each bundle's parts live in its own
 * folder (src/bundles/<bundle>) and are listed in src/bundles/parts.tsx; Home and Insights
 * show the parts of the bundles a person has, and never name a bundle themselves.
 */

/** What Home hands every card. */
export interface HomeContext {
  date: string;
  /** The day's server summary (moments coming back, birthdays, the reflection's progress…). */
  today: TodayData | undefined;
  loading: boolean;
  /** Open the moment form (Home holds one for every card). */
  newMoment: (kind: MomentKind) => void;
  editMoment: (m: Moment) => void;
}

export interface HomeCard {
  key: string;
  /** Where it sits on Home: lower comes first (time-sensitive things near the top). */
  order: number;
  Card: (props: HomeContext) => React.ReactNode;
}

/** A heading for a part of Home. */
export function SectionHead({ title, icon, action }: { title: string; icon?: React.ReactNode; action?: React.ReactNode }) {
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
