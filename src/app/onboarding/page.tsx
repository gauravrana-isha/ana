import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { FEATURE_KEYS } from "@/lib/features";
import { OnboardingJourney } from "./OnboardingJourney";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user || user.onboardedAt) redirect(homeFor(user));

  const allowed = FEATURE_KEYS.filter(
    (k) => user.features.find((f) => f.feature === k)?.allowed !== false
  );

  return (
    <OnboardingJourney
      user={{ name: user.name ?? "", email: user.email ?? "", image: user.image }}
      allowed={allowed}
    />
  );
}
