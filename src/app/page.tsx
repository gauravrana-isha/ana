import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { getCurrentUser, homeFor } from "@/lib/session";
import { Landing } from "@/components/landing/Landing";

export const metadata: Metadata = {
  title: { absolute: "ana · Absolute devotion to what's here and now" },
  description: "A private journal for your sadhana, your reflections and the moments that matter. Encrypted on your phone; only you can read it.",
};

/** Signed in: straight to your journal. Otherwise: what ana is, and how to begin. */
export default async function Root() {
  const user = await getCurrentUser();
  if (user) redirect(homeFor(user));
  return <Landing />;
}
