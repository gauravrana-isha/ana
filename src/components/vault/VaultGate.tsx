"use client";

import { useEffect, useRef, useState } from "react";
import { makeReadyOffline } from "@/lib/offline-ready";
import { useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/Button";
import { SnakeLoader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { configureOutbox, flush } from "@/lib/outbox";
import { fetchStatus, start, takePasskeyFix, tidyPasskeys, useVault, type VaultStatus } from "@/lib/vault/vault";
import { sealEverything } from "@/lib/vault/migrate";
import { KeySetup } from "./KeySetup";
import { Unlock } from "./Unlock";
import { ScreenTitle, VaultScreen } from "./VaultScreen";

/**
 * Nothing in the app opens until the journal key is here: set it up (once), unlock this
 * device (once per device), and seal anything written before the key (once). Then the app,
 * with saves made offline sent as soon as there's a connection.
 */
export function VaultGate({
  user,
  vault,
  children,
}: {
  user: { id: string; name: string; email: string; storage: "r2" | "local" };
  vault: { set: boolean; check: string | null; sealed: boolean };
  children: React.ReactNode;
}) {
  const state = useVault();
  const qc = useQueryClient();
  const { toast } = useToast();
  const [status, setStatus] = useState<VaultStatus | null>(null);
  const [statusError, setStatusError] = useState(false);
  const [sealed, setSealed] = useState(vault.sealed);
  const [justSetUp, setJustSetUp] = useState(false);

  useEffect(() => {
    start(user.id, { set: vault.set, check: vault.check }).catch(() => {});
  }, [user.id, vault.set, vault.check]);

  // Locked here: fetch the ways to unlock.
  useEffect(() => {
    if (state.status !== "locked" || status) return;
    fetchStatus()
      .then(setStatus)
      .catch(() => setStatusError(true));
  }, [state.status, status]);

  // Unlocked: send anything saved offline, and keep doing so.
  useEffect(() => {
    if (state.status !== "unlocked") return;
    configureOutbox({
      onSynced: () => qc.invalidateQueries(),
      onRejected: (_p, code) =>
        toast(code === 400 ? "A change made offline couldn't be saved. Please make it again." : "A change made offline wasn't accepted.", "error", 5000),
      onMediaRefused: (kind) =>
        toast(`A ${kind === "audio" ? "voice note" : kind} added offline couldn't be kept (too large for the space left?). Please add it again.`, "error", 6000),
    });
    void flush();
    void tidyPasskeys(user.id);
    // Signed in with Google after a passkey couldn't sign in: point to where it's fixed.
    const fix = takePasskeyFix();
    if (fix)
      toast(
        fix === "unlock-only"
          ? "To sign in with your passkey next time: Profile → Privacy & keys → Use to sign in."
          : "To sign in with a passkey next time, add one in Profile → Privacy & keys.",
        "error",
        8000
      );
    // Save the whole journal for offline use (every screen and its data), now and when the
    // connection comes back.
    void makeReadyOffline(qc);
    const back = () => void makeReadyOffline(qc);
    window.addEventListener("online", back);
    return () => window.removeEventListener("online", back);
  }, [state.status, qc, toast, user.id]);

  if (state.status === "idle" || (state.status === "locked" && !status && !statusError)) return <Waiting />;

  if (state.status === "locked" && statusError) {
    return (
      <VaultScreen step="offline">
        <ScreenTitle title="Can't reach ana" lead="This device needs a connection once, to unlock your journal. Check your connection and try again." />
        <Button className="mt-6" onClick={() => location.reload()}>Try again</Button>
      </VaultScreen>
    );
  }

  if (state.status === "none") {
    return (
      <KeySetup
        user={user}
        onDone={() => {
          setJustSetUp(true);
          setSealed(false);
        }}
      />
    );
  }

  if (state.status === "locked" && status) return <Unlock userId={user.id} email={user.email} status={status} />;

  if (!sealed) return <Sealing me={user} first={justSetUp} onDone={() => setSealed(true)} />;

  if (justSetUp) return <Done onOpen={() => setJustSetUp(false)} />;

  return <>{children}</>;
}

function Waiting() {
  return (
    <div className="min-h-dvh grid place-items-center bg-bg" role="status" aria-label="Opening your journal">
      <SnakeLoader size={56} />
    </div>
  );
}

function Sealing({ me, first, onDone }: { me: { id: string; storage: "r2" | "local" }; first: boolean; onDone: () => void }) {
  const [progress, setProgress] = useState({ done: 0, total: 0 });
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);
  const [finished, setFinished] = useState(false);
  // The count shown ticks up one by one towards the real count (the work lands in batches).
  const [shown, setShown] = useState(0);
  useEffect(() => {
    if (shown >= progress.done) return;
    const step = Math.max(1, Math.ceil((progress.done - shown) / 40));
    const t = setTimeout(() => setShown((n) => Math.min(progress.done, n + step)), 28);
    return () => clearTimeout(t);
  }, [shown, progress.done]);

  // Runs once per try (the latest `me` and `onDone` are read through a ref).
  const latest = useRef({ me, onDone });
  useEffect(() => {
    latest.current = { me, onDone };
  });
  useEffect(() => {
    let live = true;
    sealEverything(latest.current.me, (done, total) => live && setProgress({ done, total }))
      .then(() => live && setFinished(true))
      .catch((e) => live && setError(e instanceof Error ? e.message : "Something went wrong."));
    return () => {
      live = false;
    };
  }, [round]);
  // Done once the work is done and the count has caught up (with a beat to see it full).
  useEffect(() => {
    if (!finished || shown < progress.total) return;
    const t = setTimeout(() => latest.current.onDone(), 450);
    return () => clearTimeout(t);
  }, [finished, shown, progress.total]);

  // Leaving now would stop it half way (it picks up again next time, but say so).
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const pct = progress.total ? Math.round((shown / progress.total) * 100) : 0;
  return (
    <VaultScreen step="sealing">
      <div className="pt-6">
        <SnakeLoader size={64} />
        <ScreenTitle
          className="mt-6"
          title={first ? "Locking your journal" : "Finishing locking your journal"}
          lead="Everything you've written, tracked and recorded is being encrypted on this device. Keep ana open; it takes a moment."
        />
        <div className="mt-8 h-2 rounded-full bg-line overflow-hidden" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100}>
          <div className="h-full bg-accent rounded-full transition-[width] duration-150 ease-out" style={{ width: `${Math.max(4, pct)}%` }} />
        </div>
        <p className="mt-2.5 font-ui text-[13px] text-ink-soft tabular">{progress.total ? `${shown} of ${progress.total}` : "Getting ready…"}</p>
        {error && (
          <div className="mt-6">
            <p role="alert" className="font-ui text-[14px] text-danger">{error}</p>
            <Button className="mt-4" onClick={() => { setError(""); setRound((r) => r + 1); }}>Try again</Button>
          </div>
        )}
      </div>
    </VaultScreen>
  );
}

function Done({ onOpen }: { onOpen: () => void }) {
  return (
    <VaultScreen
      step="done"
      footer={
        <Button size="lg" className="w-full" onClick={onOpen}>
          Open ana
        </Button>
      }
    >
      <div className="pt-6">
        <span className="grid place-items-center w-16 h-16 rounded-[20px] bg-accent-soft text-accent">
          <svg width="30" height="30" viewBox="0 0 24 24" aria-hidden="true">
            <path className="ana-draw" d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </span>
        <ScreenTitle
          className="mt-6"
          title="Your journal is locked"
          lead="Only your devices can read it now. On this one you won't be asked again. On a new phone or computer, use your passkey or passphrase, or a device you're signed in on."
        />
        <p className="mt-4 font-ui text-[14px] leading-[1.6] text-ink-soft">You can add a passkey, change your passphrase or make new recovery words any time, from Profile → Privacy &amp; keys.</p>
      </div>
    </VaultScreen>
  );
}
