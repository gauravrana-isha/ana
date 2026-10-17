"use client";

import { useEffect, useState, useSyncExternalStore } from "react";

import { ButtonLoader } from "@/components/ui/Loader";
import { cn } from "@/lib/utils";
import { passkeyUsedHere, prepareSignIn, signInWithPasskey } from "@/lib/vault/vault";
import { Glyph } from "@/components/art/Glyphs";

/**
 * The sign-in choices. On a device that has used a passkey for ana, "Sign in with passkey"
 * leads (one tap signs in and unlocks the journal) with Google beneath; elsewhere Google
 * leads (first time here, or joining) and the passkey is the quieter second option, since a
 * passkey made on another device may have synced here.
 */
export function SignInChoices({ google }: { google: React.ReactNode }) {
  const supported = useSyncExternalStore(noop, () => typeof window.PublicKeyCredential === "function", () => false);
  const leads = useSyncExternalStore(noop, passkeyUsedHere, () => false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (supported) prepareSignIn().catch(() => {});
  }, [supported]);

  async function go() {
    setBusy(true);
    setError("");
    try {
      await signInWithPasskey();
      window.location.replace("/");
    } catch (e) {
      setError(
        e instanceof DOMException && e.name === "NotAllowedError"
          ? "No passkey was used. Try again, or continue with Google."
          : e instanceof Error
            ? e.message
            : "Couldn't sign in with a passkey."
      );
      setBusy(false);
      prepareSignIn().catch(() => {});
    }
  }

  const passkey = supported ? (
    <button
      type="button"
      onClick={go}
      disabled={busy}
      className={cn(
        "press w-full h-[52px] rounded-[14px] font-ui text-[15px] font-semibold flex items-center justify-center gap-2.5 disabled:cursor-progress",
        leads ? "bg-accent text-bg shadow-[var(--shadow-soft)] hover:brightness-110" : "bg-surface text-ink hover:bg-surface-2"
      )}
    >
      {busy ? <ButtonLoader /> : <Glyph k="fingerprint" size={22} />}
      {busy ? "Waiting for your passkey…" : "Sign in with passkey"}
    </button>
  ) : null;

  return (
    <div className="flex flex-col gap-3">
      {leads ? passkey : google}
      {supported && (
        <div className="flex items-center gap-3 font-ui text-[12px] text-ink-soft" aria-hidden="true">
          <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
        </div>
      )}
      {leads ? google : passkey}
      {error && (
        <p role="alert" className="font-ui text-[13px] leading-[1.5] text-danger">
          {error}
        </p>
      )}
    </div>
  );
}

function noop() {
  return () => {};
}
