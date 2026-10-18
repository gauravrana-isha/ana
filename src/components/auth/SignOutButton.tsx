"use client";

import { useState } from "react";
import { clear } from "idb-keyval";
import { waitingCount } from "@/lib/outbox";
import { clearPendingMedia } from "@/lib/media-outbox";
import { signOutAction } from "@/app/actions";
import { dropPushSubscription } from "@/lib/push-client";
import { dropMediaCache } from "@/lib/vault/files";
import { ButtonLoader } from "@/components/ui/Loader";
import { cn } from "@/lib/utils";
import { SignOutMark } from "@/components/art/PenMarks";
import { useConfirm } from "@/components/ui/Confirm";

/**
 * Signs out and leaves nothing behind on the device: the journal key, offline page and API
 * caches, opened photos, the pending offline saves and session state are cleared first, and
 * this device stops getting the person's notifications (phones and laptops are shared).
 */
export function SignOutButton({ className, withIcon = true, labelClassName }: { className?: string; withIcon?: boolean; labelClassName?: string }) {
  const [busy, setBusy] = useState(false);
  const ask = useConfirm();

  async function signOut() {
    // Saves and files not yet sent would be lost: say so first.
    const waiting = await waitingCount().catch(() => 0);
    if (
      waiting &&
      !(await ask({
        title: "Sign out now?",
        body: `${waiting} ${waiting === 1 ? "thing hasn't" : "things haven't"} been sent yet. Signing out now would lose ${waiting === 1 ? "it" : "them"}. Connect to the internet and wait a moment to keep ${waiting === 1 ? "it" : "them"}.`,
        confirmLabel: "Sign out anyway",
        tone: "danger",
      }))
    )
      return;
    setBusy(true);
    try {
      dropMediaCache();
      await dropPushSubscription();
      if ("caches" in window) await Promise.all((await caches.keys()).map((k) => caches.delete(k)));
      await clear().catch(() => {});
      await clearPendingMedia().catch(() => {});
      sessionStorage.clear();
    } finally {
      await signOutAction();
    }
  }

  return (
    <button
      type="button"
      onClick={signOut}
      disabled={busy}
      aria-label="Sign out"
      className={cn("press inline-flex items-center gap-1.5 h-9 px-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft", className)}
    >
      {busy ? <ButtonLoader /> : withIcon && <SignOutMark size={17} />}
      <span className={labelClassName}>Sign out</span>
    </button>
  );
}
