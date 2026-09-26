"use client";

import { useState } from "react";
import { SignOut } from "@phosphor-icons/react";
import { clear } from "idb-keyval";
import { signOutAction } from "@/app/actions";
import { dropPushSubscription } from "@/lib/push-client";
import { ButtonLoader } from "@/components/ui/Loader";
import { cn } from "@/lib/utils";

/**
 * Signs out and leaves nothing behind on the device: offline page and API caches, the
 * pending offline queue and session state are cleared first, and this device stops getting
 * the person's notifications (phones and laptops are shared).
 */
export function SignOutButton({ className, withIcon = true, labelClassName }: { className?: string; withIcon?: boolean; labelClassName?: string }) {
  const [busy, setBusy] = useState(false);

  async function signOut() {
    setBusy(true);
    try {
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
      {busy ? <ButtonLoader /> : withIcon && <SignOut size={16} />}
      <span className={labelClassName}>Sign out</span>
    </button>
  );
}
