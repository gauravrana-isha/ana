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
}

export function useMe() {
  return useQuery({
    queryKey: ["me"],
    queryFn: async (): Promise<Me> => (await fetch("/api/me")).json(),
    staleTime: 60_000,
  });
}
