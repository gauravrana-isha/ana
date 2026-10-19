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
    queryFn: async (): Promise<Me> => {
      const res = await fetch("/api/me");
      const me = (await res.json().catch(() => null)) as Me | null;
      // Only a proper reply replaces the copy kept on the device: a "signed out" or error reply
      // (a request caught mid-deploy, say) mustn't become "your details" and break every screen.
      if (!res.ok || !me || !Array.isArray(me.features)) throw new Error("Couldn't load your details");
      return openDeep(me);
    },
    staleTime: 60_000,
  });
}
