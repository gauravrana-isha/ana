"use client";

import Link from "next/link";
import { useMe } from "@/lib/me";
import { mediaUrl } from "@/lib/media-client";
import { usePrefetchScreen } from "@/lib/prefetch";
import { Avatar } from "./Sidebar";
import { QuietDot } from "./QuietDot";

/**
 * Your picture beside the bell on Home (phones): it opens Profile, which takes no tab. The quiet
 * dot shows on it while something is waiting to be sent.
 */
export function ProfileLink() {
  const { data: me } = useMe();
  const prefetch = usePrefetchScreen()("/profile");
  return (
    <Link href="/profile" {...prefetch} aria-label="Profile" className="press lg:hidden relative grid place-items-center w-12 h-12 rounded-full shrink-0">
      <span className="relative">
        <Avatar name={me?.name ?? me?.email ?? " "} image={me?.photoId ? mediaUrl(me.photoId) : (me?.image ?? null)} size={38} />
        <QuietDot className="top-0 right-0 ring-[var(--bg)]" />
      </span>
    </Link>
  );
}
