"use client";

import { useQueryClient } from "@tanstack/react-query";
import { today as todayStr } from "@/lib/dates";
import { ReflectionReadSkeleton, ReflectionStepSkeleton } from "./ScreenSkeletons";

type Saved = { answers?: Record<string, string>; stamps?: Record<string, string[]>; moodKey?: string | null };

/**
 * Daily's skeleton in the shape the day will open in: the one-question card for a day not
 * yet answered, the answered cards for a day already written. Decided from what's cached
 * on the device (the day itself, or Today's "answered" count); a fresh day if unknown.
 */
export function DailySkeleton({ date }: { date?: string }) {
  const qc = useQueryClient();
  const day = date ?? todayStr();
  const saved = qc.getQueryData<Saved>(["daily", day]);
  const summary = qc.getQueryData<{ daily?: { answered: number; mood: string | null } | null }>(["today", day]);
  const answered = saved
    ? Object.values(saved.answers ?? {}).some((v) => v.trim()) || Object.values(saved.stamps ?? {}).some((v) => v.length) || !!saved.moodKey
    : !!summary?.daily && (summary.daily.answered > 0 || !!summary.daily.mood);
  return answered ? <ReflectionReadSkeleton /> : <ReflectionStepSkeleton />;
}
