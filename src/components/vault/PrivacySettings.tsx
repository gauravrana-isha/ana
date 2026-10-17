"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

import { Button } from "@/components/ui/Button";
import { Sheet } from "@/components/ui/Sheet";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/me";
import { normaliseCode } from "@/lib/vault/crypto";
import {
  PasskeyUnsupportedError,
  addKey,
  approveLink,
  fetchStatus,
  forgetDevice,
  passkeySupport,
  preparePasskey,
  removeKey,
  replacePhrase,
  type VaultKey,
  type VaultStatus,
} from "@/lib/vault/vault";
import { PassphraseForm } from "./KeySetup";
import { RecoveryWords } from "./RecoveryWords";
import { FieldError } from "./VaultScreen";
import { useConfirm } from "@/components/ui/Confirm";
import { PlusMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";

const dateFmt = new Intl.DateTimeFormat(undefined, { day: "numeric", month: "short", year: "numeric" });

/** Profile → Privacy & keys: the ways to unlock, letting in a new device, locking this one. */
export function PrivacySettings() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data: status } = useQuery({ queryKey: ["vault-status"], queryFn: fetchStatus, staleTime: 30_000 });
  const [support, setSupport] = useState<"yes" | "no" | "maybe">("no");
  const [sheet, setSheet] = useState<null | "passphrase" | "words" | "device">(null);
  const [busy, setBusy] = useState<string | null>(null);
  const ask = useConfirm();
  const refresh = () => qc.invalidateQueries({ queryKey: ["vault-status"] });

  useEffect(() => {
    passkeySupport().then((s) => {
      setSupport(s);
      if (s !== "no") preparePasskey().catch(() => {});
    });
  }, []);

  const passkeys = status?.keys.filter((k) => k.kind === "passkey") ?? [];
  const passphrase = status?.keys.find((k) => k.kind === "passphrase");
  const phrase = status?.keys.find((k) => k.kind === "phrase");

  async function addPasskey() {
    if (!me) return;
    setBusy("passkey");
    try {
      await addKey("passkey");
      toast("Passkey added", "success", 1800);
      refresh();
    } catch (e) {
      toast(
        e instanceof PasskeyUnsupportedError
          ? "This device's passkeys can't hold your key."
          : e instanceof DOMException && e.name === "NotAllowedError"
            ? "No passkey was made."
            : "Couldn't add the passkey. Please try again.",
        "error"
      );
    } finally {
      setBusy(null);
    }
  }

  /** A passkey from before passkey sign-in: make a new one that signs in too, and retire the old. */
  async function upgrade(k: VaultKey) {
    setBusy("upgrade:" + k.id);
    try {
      await addKey("passkey");
      await removeKey(k.id);
      toast("Your passkey now signs you in too", "success", 2200);
      refresh();
    } catch (e) {
      toast(e instanceof DOMException && e.name === "NotAllowedError" ? "No passkey was made." : "Couldn't set that up. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function remove(k: VaultKey) {
    const what = k.kind === "passkey" ? k.label ?? "this passkey" : "your passphrase";
    if (!(await ask({ title: `Remove ${what}?`, body: "It won't unlock your journal any more. Your other ways in stay.", confirmLabel: "Remove", tone: "danger" }))) return;
    setBusy(k.id);
    try {
      await removeKey(k.id);
      refresh();
    } catch {
      toast("Couldn't remove it. Please try again.", "error");
    } finally {
      setBusy(null);
    }
  }

  async function lockDevice() {
    if (
      !(await ask({
        title: "Lock ana on this device?",
        body: "To open it here again you'll need your passkey, passphrase, recovery words or another device.",
        confirmLabel: "Lock it",
      }))
    )
      return;
    await forgetDevice();
    location.reload();
  }

  return (
    <section>
      <h2 className="font-display text-[19px] font-semibold text-ink mb-1.5">Privacy &amp; keys</h2>
      <p className="font-ui text-[13.5px] leading-[1.55] text-ink-soft mb-3 max-w-[60ch]">
        Your journal is locked with your own key. Only your devices can read it; the people who run ana can&rsquo;t.
      </p>

      <div className="rounded-[18px] bg-surface divide-y divide-line">
        {passkeys.map((k) => (
          <Row key={k.id} icon={<Glyph k="fingerprint" size={21} />} title={k.label ?? "Passkey"} line={used(k)}>
            {!k.signsIn && support !== "no" && (
              <Button size="sm" variant="ghost" loading={busy === "upgrade:" + k.id} onClick={() => upgrade(k)}>Use to sign in</Button>
            )}
            <Button size="sm" variant="ghost" className="text-ink-soft hover:text-danger" loading={busy === k.id} onClick={() => remove(k)}>Remove</Button>
          </Row>
        ))}
        {passphrase ? (
          <Row icon={<Glyph k="password" size={21} />} title="Passphrase" line={used(passphrase)}>
            <Button size="sm" variant="ghost" onClick={() => setSheet("passphrase")}>Change</Button>
            <Button size="sm" variant="ghost" className="text-ink-soft hover:text-danger" loading={busy === passphrase.id} onClick={() => remove(passphrase)}>Remove</Button>
          </Row>
        ) : null}
        <Row icon={<Glyph k="words" size={21} />} title="Recovery words" line={phrase ? `Made ${dateFmt.format(new Date(phrase.createdAt))}` : "12 words on paper"}>
          <Button size="sm" variant="ghost" onClick={() => setSheet("words")}>Make new words</Button>
        </Row>
        <div className="flex flex-wrap gap-2 px-4 py-3.5">
          {support !== "no" && passkeys.length < 6 && (
            <Button size="sm" variant="secondary" loading={busy === "passkey"} onClick={addPasskey}>
              <PlusMark size={15} /> Add a passkey
            </Button>
          )}
          {!passphrase && (
            <Button size="sm" variant="secondary" onClick={() => setSheet("passphrase")}>
              <PlusMark size={15} /> Add a passphrase
            </Button>
          )}
        </div>
      </div>

      <div className="mt-3 flex flex-wrap gap-2.5">
        <Button variant="secondary" onClick={() => setSheet("device")}>
          <Glyph k="phone" size={18} /> Let in a new device
        </Button>
        <Button variant="ghost" className="text-ink-soft" onClick={lockDevice}>
          <Glyph k="lock" size={18} /> Lock this device
        </Button>
      </div>

      <PassphraseSheet open={sheet === "passphrase"} status={status} onClose={() => setSheet(null)} onDone={refresh} />
      <NewWordsSheet open={sheet === "words"} status={status} onClose={() => setSheet(null)} onDone={refresh} />
      <LetInSheet open={sheet === "device"} onClose={() => setSheet(null)} />
    </section>
  );
}

function used(k: VaultKey) {
  return `Added ${dateFmt.format(new Date(k.createdAt))}`;
}

function Row({ icon, title, line, children }: { icon: React.ReactNode; title: string; line: string; children?: React.ReactNode }) {
  return (
    // On narrow screens the actions drop below the title rather than squeezing it.
    <div className="flex flex-wrap items-center gap-x-3.5 gap-y-1 px-4 py-3.5">
      <span className="grid place-items-center w-9 h-9 rounded-[11px] bg-accent-soft text-accent shrink-0">{icon}</span>
      <span className="flex-1 min-w-[160px]">
        <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{title}</span>
        <span className="block font-ui text-[12.5px] text-ink-soft mt-0.5">{line}</span>
      </span>
      <span className="flex items-center gap-1 shrink-0 ml-auto -mr-2">{children}</span>
    </div>
  );
}

function PassphraseSheet({ open, status, onClose, onDone }: { open: boolean; status?: VaultStatus; onClose: () => void; onDone: () => void }) {
  const { toast } = useToast();
  const old = status?.keys.find((k) => k.kind === "passphrase");
  return (
    <Sheet open={open} onClose={onClose} title={old ? "Change passphrase" : "Add a passphrase"}>
      {open && (
        <PassphraseForm
          title={old ? "A new passphrase" : "Choose a passphrase"}
          cta={old ? "Change it" : "Add it"}
          onSubmit={async (p) => {
            await addKey("passphrase", { passphrase: p });
            if (old) await removeKey(old.id);
            toast(old ? "Passphrase changed" : "Passphrase added", "success", 1800);
            onDone();
            onClose();
          }}
        />
      )}
    </Sheet>
  );
}

function NewWordsSheet({ open, status, onClose, onDone }: { open: boolean; status?: VaultStatus; onClose: () => void; onDone: () => void }) {
  const [phrase, setPhrase] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [kept, setKept] = useState(false);
  const close = () => {
    setPhrase(null);
    setKept(false);
    setError("");
    onClose();
  };
  return (
    <Sheet
      open={open}
      onClose={() => (phrase && !kept ? undefined : close())}
      title="New recovery words"
      busy={busy}
      footer={
        phrase ? (
          <div className="flex justify-end">
            <Button onClick={close} disabled={!kept}>Done</Button>
          </div>
        ) : (
          <div className="flex justify-end gap-3">
            <Button variant="secondary" onClick={close}>Cancel</Button>
            <Button
              loading={busy}
              disabled={!status}
              onClick={async () => {
                setBusy(true);
                setError("");
                try {
                  setPhrase(await replacePhrase(status!));
                  onDone();
                } catch {
                  setError("Couldn't make new words. Please try again.");
                } finally {
                  setBusy(false);
                }
              }}
            >
              Make new words
            </Button>
          </div>
        )
      }
    >
      {phrase ? (
        <div className="flex flex-col gap-4">
          <p className="font-ui text-[14.5px] leading-[1.6] text-ink">These are your new recovery words. Your old ones no longer work. Write these down and keep them somewhere safe.</p>
          <RecoveryWords phrase={phrase} />
          <label className="flex items-center gap-2.5 font-ui text-[14.5px] text-ink cursor-pointer">
            <input type="checkbox" checked={kept} onChange={(e) => setKept(e.target.checked)} className="w-5 h-5 accent-[var(--accent)]" />
            I&rsquo;ve written them down
          </label>
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          <p className="font-ui text-[14.5px] leading-[1.6] text-ink">Lost your words, or worried someone saw them? Make new ones. The old words stop working straight away.</p>
          <FieldError>{error}</FieldError>
        </div>
      )}
    </Sheet>
  );
}

function LetInSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [done, setDone] = useState(false);
  const close = () => {
    setCode("");
    setError("");
    setDone(false);
    onClose();
  };
  const normal = normaliseCode(code);
  return (
    <Sheet open={open} onClose={close} title="Let in a new device" busy={busy}>
      {done ? (
        <div className="flex flex-col gap-4">
          <p className="font-ui text-[15px] leading-[1.6] text-ink">Done. The other device is opening your journal now.</p>
          <div className="flex justify-end">
            <Button onClick={close}>Close</Button>
          </div>
        </div>
      ) : (
        <form
          className="flex flex-col gap-4"
          onSubmit={async (e) => {
            e.preventDefault();
            if (!normal) return setError("The code has 10 letters and numbers.");
            setBusy(true);
            setError("");
            try {
              await approveLink(normal);
              setDone(true);
            } catch (err) {
              setError(err instanceof Error ? err.message : "Couldn't let it in.");
            } finally {
              setBusy(false);
            }
          }}
        >
          <p className="font-ui text-[14.5px] leading-[1.6] text-ink">
            On the new device, sign in to ana and choose <b className="font-semibold">Use a device you&rsquo;re signed in on</b>. Type the code it shows:
          </p>
          <input
            value={code}
            onChange={(e) => setCode(e.target.value.toUpperCase())}
            placeholder="ABCDE-FGHJK"
            autoFocus
            autoCapitalize="characters"
            autoCorrect="off"
            spellCheck={false}
            autoComplete="off"
            inputMode="text"
            className="w-full h-14 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[22px] font-semibold tracking-[0.12em] text-center tabular outline-none border border-transparent focus:border-accent transition-colors placeholder:text-ink-soft/50"
          />
          <FieldError>{error}</FieldError>
          <p className="font-ui text-[12.5px] leading-[1.55] text-ink-soft">Only let in a device you&rsquo;re holding. Your key goes to it encrypted, so only that device can open it.</p>
          <div className="flex justify-end gap-3">
            <Button variant="secondary" type="button" onClick={close}>Cancel</Button>
            <Button type="submit" loading={busy} disabled={!normal}>Let it in</Button>
          </div>
        </form>
      )}
    </Sheet>
  );
}
