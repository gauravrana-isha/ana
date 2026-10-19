"use client";

import { useQuery } from "@tanstack/react-query";
import type { FeatureKey } from "./features";
import type { BundleKey } from "./bundles";
import { openDeep } from "./vault/vault";
import type { QuestionSets } from "./questions";

export interface Me {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "MEMBER" | "ADMIN";
  status: string;
  features: FeatureKey[];
  /** The bundles they have (Sadhana, Reflection, Presence…). */
  bundles: BundleKey[];
  storage: "r2" | "local";
  intention: string | null;
  preferredName: string | null;
  photoId: string | null;
  birthday: string | null;
  place: string | null;
  questions: QuestionSets | null;
  portraitEveryMonths: number;
  createdAt?: string;
}

/** What ana calls you: your chosen name, else your first name. */
export function callName(me: Pick<Me, "name" | "preferredName"> | undefined | null) {
  return me?.preferredName || me?.name?.split(" ")[0] || null;
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => openDeep((await (await fetch("/api/me")).json()) as Me),
    staleTime: 60_000,
  });
}
