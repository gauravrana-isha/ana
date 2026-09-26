"use client";

import { useQuery } from "@tanstack/react-query";
import type { FeatureKey } from "./features";

export interface Me {
  id: string;
  name: string | null;
  email: string | null;
  image: string | null;
  role: "MEMBER" | "ADMIN";
  status: string;
  features: FeatureKey[];
  allowedFeatures: FeatureKey[];
  storage: "blob" | "local";
  intention: string | null;
  preferredName: string | null;
  photoId: string | null;
  birthday: string | null;
  place: string | null;
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
    queryFn: async (): Promise<Me> => (await fetch("/api/me")).json(),
    staleTime: 60_000,
  });
}
