import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { OnboardingJourney } from "./OnboardingJourney";

export const metadata: Metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user || user.onboardedAt) redirect(homeFor(user));

  return (
    <OnboardingJourney
      user={{ id: user.id, name: user.name ?? "", email: user.email ?? "", image: user.image }}
      bundles={user.bundles}
      vault={{ set: !!user.vaultAt, check: user.vaultCheck }}
    />
  );
}
