"use client";

import { useState } from "react";
import { clear, get } from "idb-keyval";
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
    // Saves made offline that haven't gone yet would be lost: say so first.
    const waiting = (await get<unknown[]>("ana-outbox").catch(() => undefined))?.length ?? 0;
    if (
      waiting &&
      !(await ask({
        title: "Sign out and lose unsent changes?",
        body: `${waiting} ${waiting === 1 ? "change made offline hasn't" : "changes made offline haven't"} been sent yet. Connect to the internet first to keep ${waiting === 1 ? "it" : "them"}.`,
        confirmLabel: "Sign out",
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
