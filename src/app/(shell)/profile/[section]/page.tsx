"use client";

import { use } from "react";
import { notFound, redirect } from "next/navigation";
import { ProfileHub, isSectionKey } from "@/components/profile/ProfileHub";

/** One part of Profile: its own page on phones, the open panel beside the list on wider screens. */
export default function ProfileSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  // Theme and notifications used to be two pages.
  if (section === "appearance" || section === "notifications") redirect("/profile/device");
  // Sections are given by the admin now; there's nothing to choose here.
  if (section === "sections") redirect("/profile");
  if (!isSectionKey(section)) notFound();
  return <ProfileHub section={section} />;
}
