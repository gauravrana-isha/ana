"use client";

import { use } from "react";
import { notFound } from "next/navigation";
import { ProfileHub, isSectionKey } from "@/components/profile/ProfileHub";

/** One part of Profile: its own page on phones, the open panel beside the list on wider screens. */
export default function ProfileSectionPage({ params }: { params: Promise<{ section: string }> }) {
  const { section } = use(params);
  if (!isSectionKey(section)) notFound();
  return <ProfileHub section={section} />;
}
