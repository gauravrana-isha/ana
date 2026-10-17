"use client";

import { useEffect, useMemo, useState } from "react";
import { EyeSlash, Fingerprint, Key, LockSimple, Password, Eye } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/utils";
import {
  PasskeyUnsupportedError,
  draftAddPasskey,
  draftAddPassphrase,
  finishVault,
  newDraft,
  newPhrase,
  passkeySupport,
  phraseWords,
} from "@/lib/vault/vault";
import { ChoiceCard, FieldError, ScreenTitle, VaultScreen } from "./VaultScreen";
import { RecoveryWords } from "./RecoveryWords";

type Step = "intro" | "how" | "passphrase" | "words" | "check";

/**
 * Locking the journal with the person's own key: why (briefly), how they'll unlock it
 * (a passkey, or a passphrase), their recovery words, a quick check, then it's saved.
 * `firstTime` is for someone joining (the journal is empty); otherwise it's an existing journal.
 */
export function KeySetup({
  user,
  firstTime = false,
  onDone,
}: {
  user: { id: string; name: string; email: string };
  firstTime?: boolean;
  onDone: () => void;
}) {
  const [step, setStep] = useState<Step>("intro");
  const [draft] = useState(newDraft);
  const [phrase] = useState(newPhrase);
  const [support, setSupport] = useState<"yes" | "no" | "maybe" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [method, setMethod] = useState<"passkey" | "passphrase" | null>(null);

  useEffect(() => {
    passkeySupport().then(setSupport);
  }, []);

  function go(to: Step) {
    setError("");
    setStep(to);
    window.scrollTo({ top: 0 });
  }

  async function makePasskey() {
    setBusy(true);
    setError("");
    try {
      await draftAddPasskey(draft, { name: user.name, email: user.email });
      setMethod("passkey");
      go("words");
    } catch (e) {
      if (e instanceof PasskeyUnsupportedError) {
        setSupport("no");
        setError("This device's passkeys can't hold your key. Choose a passphrase instead.");
      } else if (e instanceof DOMException && e.name === "NotAllowedError") {
        setError("The passkey wasn't made. Try again, or use a passphrase.");
      } else {
        setError("Something went wrong making the passkey. Try again, or use a passphrase.");
      }
    } finally {
      setBusy(false);
    }
  }

  const footer =
    step === "intro" ? (
      <Button size="lg" className="w-full" onClick={() => go("how")}>
        {firstTime ? "Continue" : "Lock my journal"}
      </Button>
    ) : null;

  return (
    <VaultScreen step={step} footer={footer} top={step !== "intro" && step !== "check" ? <BackButton onClick={() => go(step === "how" ? "intro" : step === "passphrase" ? "how" : step === "words" ? "how" : "words")} /> : null}>
      {step === "intro" && <Intro firstTime={firstTime} />}

      {step === "how" && (
        <div>
          <ScreenTitle title="How will you unlock it?" lead="On this device you'll rarely be asked. This is for a new phone or laptop, or after signing out." />
          <div className="mt-7 flex flex-col gap-2.5">
            {support !== "no" && (
              <ChoiceCard
                icon={<Fingerprint size={22} />}
                title="A passkey"
                line="Face ID, a fingerprint or your device PIN. Nothing to remember."
                tag="Best"
                onClick={makePasskey}
                busy={busy}
              />
            )}
            <ChoiceCard icon={<Password size={22} />} title="A passphrase" line="A few words only you know. Works on any device." onClick={() => go("passphrase")} />
          </div>
          {support === "no" && (
            <p className="mt-4 font-ui text-[13.5px] leading-[1.55] text-ink-soft">This browser can&rsquo;t keep your key in a passkey, so a passphrase it is. You can add a passkey later from a device that can.</p>
          )}
          <div className="mt-4">
            <FieldError>{error}</FieldError>
          </div>
        </div>
      )}

      {step === "passphrase" && (
        <PassphraseForm
          onSubmit={async (p) => {
            await draftAddPassphrase(draft, p);
            setMethod("passphrase");
            go("words");
          }}
        />
      )}

      {step === "words" && <Words phrase={phrase} method={method} onNext={() => go("check")} />}

      {step === "check" && (
        <CheckWords
          phrase={phrase}
          onBack={() => go("words")}
          onConfirmed={async () => {
            await finishVault(user.id, draft, phrase);
            onDone();
          }}
        />
      )}
    </VaultScreen>
  );
}

function BackButton({ onClick }: { onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className="press h-9 px-3 -mr-2 rounded-[11px] font-ui text-[13.5px] font-semibold text-ink-soft hover:text-ink hover:bg-surface">
      Back
    </button>
  );
}

function Intro({ firstTime }: { firstTime: boolean }) {
  const points = [
    { icon: <LockSimple size={20} />, text: "Everything you write, track and record is locked on your device before it's sent." },
    { icon: <EyeSlash size={20} />, text: "No one else can read it. Not the people who run ana, not anyone with the database." },
    { icon: <Key size={20} />, text: "You'll keep 12 recovery words. If you lose your devices and those words, no one can open your journal again, not even us." },
  ];
  return (
    <div>
      <div className="relative mb-7 grid place-items-center h-[150px] rounded-[24px] bg-surface overflow-hidden">
        <LockArt />
      </div>
      <ScreenTitle
        title={firstTime ? "Your journal is yours alone" : "Your journal, for your eyes only"}
        lead={firstTime ? "Before you begin, ana gives your journal its own key." : "ana now locks your journal with a key that only your devices hold. It takes a minute, once."}
      />
      <ul className="mt-6 flex flex-col gap-3">
        {points.map((p, i) => (
          <li key={i} className="flex gap-3.5 items-start">
            <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-accent-soft text-accent shrink-0">{p.icon}</span>
            <span className="font-ui text-[15px] leading-[1.55] text-ink pt-1.5">{p.text}</span>
          </li>
        ))}
      </ul>
      <p className="mt-6 font-ui text-[13px] leading-[1.55] text-ink-soft">
        What stays visible to the people who run ana: your name and email, when you joined and were last here, how much you&rsquo;ve stored, and the dates of entries. Never their words, photos or recordings.
      </p>
    </div>
  );
}

/** A lotus inside a softly drawn lock: the page's single picture. */
function LockArt() {
  return (
    <svg width="120" height="120" viewBox="0 0 120 120" aria-hidden="true" className="text-accent">
      <path className="ana-draw" d="M38 54V42a22 22 0 0 1 44 0v12" fill="none" stroke="currentColor" strokeWidth="5" strokeLinecap="round" />
      <rect x="26" y="52" width="68" height="54" rx="16" fill="var(--accent-soft)" stroke="currentColor" strokeWidth="4" />
      <path d="M60 64c5 6 7 11 7 16s-3 9-7 11c-4-2-7-6-7-11s2-10 7-16z" fill="currentColor" opacity=".85" />
      <path d="M44 78c6 0 11 3 14 9-6 2-12 1-15-3-1-2-1-4 1-6zM76 78c-6 0-11 3-14 9 6 2 12 1 15-3 1-2 1-4-1-6z" fill="currentColor" opacity=".55" />
    </svg>
  );
}

function strength(p: string) {
  let s = 0;
  if (p.length >= 10) s++;
  if (p.length >= 16) s++;
  if (/[a-z]/i.test(p) && /[^a-z]/i.test(p)) s++;
  if (/\s/.test(p.trim())) s++;
  return Math.min(3, s);
}

export function PassphraseForm({ onSubmit, cta = "Continue", title = "Choose a passphrase" }: { onSubmit: (p: string) => Promise<void>; cta?: string; title?: string }) {
  const [p, setP] = useState("");
  const [again, setAgain] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const s = strength(p);
  const long = p.length >= 10;
  const same = p === again;

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!long) return setError("Use at least 10 characters. A short sentence works well.");
    if (!same) return setError("The two don't match.");
    setBusy(true);
    setError("");
    try {
      await onSubmit(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Please try again.");
      setBusy(false);
    }
  }

  const input = "w-full h-12 px-4 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent transition-colors";
  return (
    <form onSubmit={submit}>
      <ScreenTitle title={title} lead="A short sentence only you would know is easiest to remember, e.g. three or four words with a space between." />
      <div className="mt-7 flex flex-col gap-4">
        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Passphrase</span>
          <span className="relative mt-2 block">
            <input type={show ? "text" : "password"} value={p} onChange={(e) => setP(e.target.value)} autoComplete="new-password" autoFocus className={cn(input, "pr-12")} />
            <button type="button" onClick={() => setShow((v) => !v)} aria-label={show ? "Hide" : "Show"} className="absolute right-1.5 top-1.5 grid place-items-center w-9 h-9 rounded-[10px] text-ink-soft hover:text-ink hover:bg-surface-2">
              {show ? <EyeSlash size={18} /> : <Eye size={18} />}
            </button>
          </span>
          <span className="mt-2 flex items-center gap-2" aria-live="polite">
            {[0, 1, 2].map((i) => (
              <span key={i} className={cn("h-1 flex-1 rounded-full transition-colors", p && i < Math.max(1, s) ? (s >= 2 && long ? "bg-accent" : "bg-[color-mix(in_srgb,var(--accent)_45%,var(--line))]") : "bg-line")} />
            ))}
            <span className="font-ui text-[12px] text-ink-soft w-16 text-right">{!p ? "" : !long ? "Too short" : s >= 3 ? "Strong" : s === 2 ? "Good" : "Okay"}</span>
          </span>
        </label>
        <label className="block">
          <span className="font-ui text-[13px] font-semibold text-ink">Once more</span>
          <input type={show ? "text" : "password"} value={again} onChange={(e) => setAgain(e.target.value)} autoComplete="new-password" className={cn(input, "mt-2")} />
        </label>
        <FieldError>{error}</FieldError>
        <Button size="lg" type="submit" className="w-full mt-2" loading={busy} disabled={!p || !again}>
          {cta}
        </Button>
      </div>
    </form>
  );
}

function Words({ phrase, method, onNext }: { phrase: string; method: "passkey" | "passphrase" | null; onNext: () => void }) {
  const [kept, setKept] = useState(false);
  return (
    <div>
      <ScreenTitle
        title="Your recovery words"
        lead={
          <>
            {method === "passkey" ? "Your passkey is ready. " : method === "passphrase" ? "Your passphrase is set. " : ""}
            If you ever lose {method === "passkey" ? "your passkey" : "your passphrase"} and your devices, these 12 words are the only way back in. Write them on paper and keep it somewhere safe.
          </>
        }
      />
      <div className="mt-6">
        <RecoveryWords phrase={phrase} />
      </div>
      <p className="mt-4 font-ui text-[13px] leading-[1.55] text-ink-soft">Don&rsquo;t keep them in email, chat or photos. Anyone with these words can open your journal.</p>
      <label className="mt-5 flex items-center gap-3 cursor-pointer select-none">
        <input type="checkbox" checked={kept} onChange={(e) => setKept(e.target.checked)} className="peer sr-only" />
        <span aria-hidden="true" className="grid place-items-center w-6 h-6 rounded-[8px] border-[1.5px] border-line bg-bg peer-checked:bg-accent peer-checked:border-accent text-bg transition-colors peer-focus-visible:ring-2 peer-focus-visible:ring-accent/40">
          {kept && (
            <svg width="14" height="14" viewBox="0 0 24 24"><path d="M5 12.5l4.5 4.5L19 7.5" fill="none" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" /></svg>
          )}
        </span>
        <span className="font-ui text-[15px] text-ink">I&rsquo;ve written them down</span>
      </label>
      <Button size="lg" className="w-full mt-6" onClick={onNext} disabled={!kept}>
        Continue
      </Button>
    </div>
  );
}

function CheckWords({ phrase, onConfirmed, onBack }: { phrase: string; onConfirmed: () => Promise<void>; onBack: () => void }) {
  const words = phraseWords(phrase);
  // Two positions to check, picked once.
  const [asks] = useState(() => {
    const a = Math.floor(Math.random() * 6);
    const b = 6 + Math.floor(Math.random() * 6);
    return [a, b];
  });
  const [answers, setAnswers] = useState(["", ""]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const right = useMemo(() => asks.map((i, k) => answers[k].trim().toLowerCase() === words[i]), [asks, answers, words]);

  async function confirm(e: React.FormEvent) {
    e.preventDefault();
    if (!right.every(Boolean)) return setError("One of those doesn't match. Look at your words again.");
    setBusy(true);
    setError("");
    try {
      await onConfirmed();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Couldn't save your key. Please try again.");
      setBusy(false);
    }
  }

  return (
    <form onSubmit={confirm}>
      <ScreenTitle title="Check your words" lead="Type two of them from what you wrote down, to be sure they're right." />
      <div className="mt-7 grid grid-cols-2 gap-3">
        {asks.map((i, k) => (
          <label key={i} className="block">
            <span className="font-ui text-[13px] font-semibold text-ink">Word {i + 1}</span>
            <input
              value={answers[k]}
              onChange={(e) => setAnswers((a) => a.map((v, j) => (j === k ? e.target.value : v)))}
              autoCapitalize="none"
              autoCorrect="off"
              spellCheck={false}
              autoComplete="off"
              autoFocus={k === 0}
              className={cn(
                "mt-2 w-full h-12 px-4 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border transition-colors",
                answers[k] && right[k] ? "border-accent/60" : "border-transparent focus:border-accent"
              )}
            />
          </label>
        ))}
      </div>
      <div className="mt-4">
        <FieldError>{error}</FieldError>
      </div>
      <Button size="lg" type="submit" className="w-full mt-5" loading={busy} disabled={answers.some((a) => !a.trim())}>
        Lock my journal
      </Button>
      <button type="button" onClick={onBack} disabled={busy} className="press mt-2 w-full h-11 rounded-[14px] font-ui text-[14px] font-semibold text-ink-soft hover:text-ink">
        See my words again
      </button>
    </form>
  );
}
