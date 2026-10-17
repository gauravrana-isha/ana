"use client";

import { useEffect, useRef, useState } from "react";

import { Button } from "@/components/ui/Button";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { cn } from "@/lib/utils";
import {
  PasskeyUnsupportedError,
  isValidPhrase,
  requestLink,
  unlockWithPassphrase,
  unlockWithPasskey,
  unlockWithPhrase,
  type VaultStatus,
} from "@/lib/vault/vault";
import { ChoiceCard, FieldError, ScreenTitle, VaultScreen } from "./VaultScreen";
import { Glyph } from "@/components/art/Glyphs";

type Mode = "choose" | "device" | "passphrase" | "words";

/**
 * This device doesn't have the journal key yet (a new device, or after signing out):
 * unlock it once with a passkey, another signed-in device, a passphrase or the recovery
 * words. After that, ana opens here as usual.
 */
export function Unlock({ userId, email, status }: { userId: string; email?: string; status: VaultStatus }) {
  const [mode, setMode] = useState<Mode>("choose");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const hasPasskey = status.keys.some((k) => k.kind === "passkey");
  const hasPassphrase = status.keys.some((k) => k.kind === "passphrase");

  function go(m: Mode) {
    setError("");
    setMode(m);
  }

  async function passkey() {
    setBusy(true);
    setError("");
    try {
      await unlockWithPasskey(userId, status);
    } catch (e) {
      setError(
        e instanceof PasskeyUnsupportedError
          ? "That passkey can't unlock your journal here. Try another way."
          : e instanceof DOMException && e.name === "NotAllowedError"
            ? "No passkey was used. Try again, or choose another way."
            : e instanceof Error
              ? e.message
              : "Couldn't unlock. Try another way."
      );
      setBusy(false);
    }
  }

  return (
    <VaultScreen
      step={mode}
      top={
        mode === "choose" ? (
          <SignOutButton withIcon={false} className="-mr-2 text-ink-soft" />
        ) : (
          <button type="button" onClick={() => go("choose")} className="press h-9 px-3 -mr-2 rounded-[11px] font-ui text-[13.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
            Back
          </button>
        )
      }
    >
      {mode === "choose" && (
        <div>
          <ScreenTitle title="Unlock your journal" lead="This device needs your key once. After that, ana opens here as usual." />
          <div className="mt-7 flex flex-col gap-2.5">
            {hasPasskey && <ChoiceCard icon={<Glyph k="fingerprint" size={24} />} title="Use your passkey" line="Face ID, fingerprint or device PIN" onClick={passkey} busy={busy} />}
            <ChoiceCard icon={<Glyph k="phone" size={24} />} title="Use a device you're signed in on" line="Show a code here, confirm it there" onClick={() => go("device")} />
            {hasPassphrase && <ChoiceCard icon={<Glyph k="password" size={24} />} title="Use your passphrase" line="The words you chose" onClick={() => go("passphrase")} />}
            <ChoiceCard icon={<Glyph k="words" size={24} />} title="Use your recovery words" line="The 12 words you wrote down" onClick={() => go("words")} />
          </div>
          <div className="mt-4">
            <FieldError>{error}</FieldError>
          </div>
        </div>
      )}

      {mode === "device" && <FromDevice userId={userId} email={email} status={status} />}

      {mode === "passphrase" && (
        <SecretForm
          title="Your passphrase"
          lead="The passphrase you chose when you locked your journal."
          label="Passphrase"
          type="password"
          onSubmit={(v) => unlockWithPassphrase(userId, status, v)}
          slowNote
        />
      )}

      {mode === "words" && <WordsForm userId={userId} status={status} />}
    </VaultScreen>
  );
}

function SecretForm({
  title,
  lead,
  label,
  type,
  onSubmit,
  slowNote,
}: {
  title: string;
  lead: string;
  label: string;
  type: "password" | "text";
  onSubmit: (v: string) => Promise<void>;
  slowNote?: boolean;
}) {
  const [value, setValue] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        setBusy(true);
        setError("");
        try {
          await onSubmit(value);
        } catch (err) {
          setError(err instanceof Error ? err.message : "That didn't unlock it.");
          setBusy(false);
        }
      }}
    >
      <ScreenTitle title={title} lead={lead} />
      <label className="block mt-7">
        <span className="font-ui text-[13px] font-semibold text-ink">{label}</span>
        <input
          type={type}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          autoFocus
          autoComplete="current-password"
          className="mt-2 w-full h-12 px-4 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent transition-colors"
        />
      </label>
      <div className="mt-3">
        <FieldError>{error}</FieldError>
      </div>
      <Button size="lg" type="submit" className="w-full mt-5" loading={busy} disabled={!value}>
        Unlock
      </Button>
      {slowNote && busy && <p className="mt-3 text-center font-ui text-[12.5px] text-ink-soft">Checking takes a moment, on purpose.</p>}
    </form>
  );
}

function WordsForm({ userId, status }: { userId: string; status: VaultStatus }) {
  const [words, setWords] = useState<string[]>(Array(12).fill(""));
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const refs = useRef<(HTMLInputElement | null)[]>([]);
  const phrase = words.map((w) => w.trim().toLowerCase()).join(" ");
  const complete = words.every((w) => w.trim());

  function setWord(i: number, v: string) {
    // Pasting all twelve at once fills every box.
    const parts = v.trim().split(/\s+/);
    if (parts.length > 1) {
      setWords((cur) => cur.map((w, j) => (j >= i && j - i < parts.length ? parts[j - i].toLowerCase() : w)));
      refs.current[Math.min(11, i + parts.length)]?.focus();
      return;
    }
    setWords((cur) => cur.map((w, j) => (j === i ? v : w)));
  }

  return (
    <form
      onSubmit={async (e) => {
        e.preventDefault();
        if (!isValidPhrase(phrase)) return setError("Those words don't make a recovery phrase. Check each one, and their order.");
        setBusy(true);
        setError("");
        try {
          await unlockWithPhrase(userId, status, phrase);
        } catch (err) {
          setError(err instanceof Error ? err.message : "Those words didn't unlock it.");
          setBusy(false);
        }
      }}
    >
      <ScreenTitle title="Your recovery words" lead="Type the 12 words in order. You can paste them all into the first box." />
      <ol className="mt-7 grid grid-cols-2 sm:grid-cols-3 gap-2">
        {words.map((w, i) => (
          <li key={i} className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 font-ui text-[12px] text-ink-soft tabular pointer-events-none">{i + 1}</span>
            <input
              ref={(el) => {
                refs.current[i] = el;
              }}
              value={w}
              onChange={(e) => setWord(i, e.target.value)}
              onKeyDown={(e) => {
                if (e.key === " " || (e.key === "Enter" && i < 11)) {
                  e.preventDefault();
                  refs.current[i + 1]?.focus();
                }
              }}
              aria-label={`Word ${i + 1}`}
              autoFocus={i === 0}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              className={cn("w-full h-11 pl-8 pr-2 rounded-[12px] bg-surface text-ink font-ui text-[15px] outline-none border border-transparent focus:border-accent transition-colors")}
            />
          </li>
        ))}
      </ol>
      <div className="mt-3">
        <FieldError>{error}</FieldError>
      </div>
      <Button size="lg" type="submit" className="w-full mt-5" loading={busy} disabled={!complete}>
        Unlock
      </Button>
    </form>
  );
}

function FromDevice({ userId, email, status }: { userId: string; email?: string; status: VaultStatus }) {
  const [code, setCode] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [round, setRound] = useState(0);

  useEffect(() => {
    let cancel: (() => void) | null = null;
    let live = true;
    requestLink(userId, status)
      .then(async (link) => {
        if (!live) return link.cancel();
        cancel = link.cancel;
        setCode(link.code);
        await link.wait();
      })
      .catch((e) => live && setError(e instanceof Error ? e.message : "Couldn't start. Try again."));
    return () => {
      live = false;
      cancel?.();
    };
  }, [userId, status, round]);

  return (
    <div>
      <ScreenTitle title="Use a device you're signed in on" lead="On a phone or computer where ana is already open:" />
      <ol className="mt-5 flex flex-col gap-2.5 font-ui text-[15px] leading-[1.5] text-ink">
        <li className="flex gap-3"><Num n={1} /><span>Open <b className="font-semibold">Profile</b>, then <b className="font-semibold">Privacy &amp; keys</b>{email ? <> (signed in as <b className="font-semibold break-all">{email}</b>)</> : null}.</span></li>
        <li className="flex gap-3"><Num n={2} /><span>Tap <b className="font-semibold">Let in a new device</b> and type this code:</span></li>
      </ol>
      <div className="mt-5 rounded-[20px] bg-surface px-5 py-6 text-center">
        {code ? (
          <p className="font-ui text-[30px] sm:text-[34px] font-semibold tracking-[0.12em] text-ink tabular select-all" aria-live="polite">{code}</p>
        ) : (
          <span className="inline-block w-6 h-6 rounded-full border-2 border-accent/30 border-t-accent animate-spin" />
        )}
        <p className="mt-3 flex items-center justify-center gap-2 font-ui text-[13px] text-ink-soft">
          <span className="w-2 h-2 rounded-full bg-accent animate-pulse" /> Waiting for the other device…
        </p>
      </div>
      <p className="mt-4 font-ui text-[13px] leading-[1.55] text-ink-soft">The code works for 10 minutes. Your key travels between your devices encrypted; ana&rsquo;s server can&rsquo;t read it.</p>
      <div className="mt-3">
        <FieldError>{error}</FieldError>
      </div>
      {error && (
        <Button variant="secondary" className="mt-3" onClick={() => { setError(""); setCode(null); setRound((r) => r + 1); }}>
          Start again
        </Button>
      )}
    </div>
  );
}

function Num({ n }: { n: number }) {
  return <span className="grid place-items-center w-6 h-6 rounded-full bg-accent-soft text-accent font-ui text-[12.5px] font-semibold shrink-0 mt-0.5">{n}</span>;
}
