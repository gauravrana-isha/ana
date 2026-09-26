"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Trash } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { Busy } from "@/components/ui/Busy";
import { Ornament } from "@/components/art/Ornament";
import { PortraitPond } from "@/components/profile/PortraitPond";
import { longDate, usePortraits } from "@/components/profile/WhoAmI";
import { useMe } from "@/lib/me";
import { MAX_WORDS, REVISIT_CHOICES, RINGS, SCALE_WEIGHTS, WEIGHT_SCALE, toneStyle, type PortraitDTO, type RingKey, type Weights } from "@/lib/portrait";
import { cn } from "@/lib/utils";

/** Words in their own colours, separated by quiet dots. */
function Words({ words, weights, className }: { words: string[]; weights?: Weights; className?: string }) {
  if (!words.length) return <span className={cn("text-ink-soft", className)}>…</span>;
  return (
    <span className={className}>
      {words.map((w, i) => (
        <span key={w}>
          {i > 0 && <span className="text-ink-soft/50"> · </span>}
          <span className="tone-text" style={toneStyle(w, weights)}>{w}</span>
        </span>
      ))}
    </span>
  );
}

type Draft = Record<RingKey, { words: string[]; note: string }> & { weights: Weights };
const EMPTY: Draft = { body: { words: [], note: "" }, mind: { words: [], note: "" }, emotion: { words: [], note: "" }, weights: {} };

export default function WhoAmIPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data: portraits, isLoading } = usePortraits();
  const [composing, setComposing] = useState(false);
  const [draft, setDraft] = useState<Draft>(EMPTY);
  const [saving, setSaving] = useState(false);
  const [compareId, setCompareId] = useState<string | null>(null);
  const [savingRevisit, setSavingRevisit] = useState(false);

  if (isLoading || !portraits) return <div className="py-20 grid place-items-center"><Loader /></div>;
  const latest = portraits[0] ?? null;
  const writing = composing || !latest;
  const earlier = portraits.slice(1);
  const compare = earlier.find((p) => p.id === compareId) ?? null;

  const toggleWord = (ring: RingKey, w: string) =>
    setDraft((d) => {
      const has = d[ring].words.includes(w);
      if (!has && d[ring].words.length >= MAX_WORDS) return d;
      return { ...d, [ring]: { ...d[ring], words: has ? d[ring].words.filter((x) => x !== w) : [...d[ring].words, w] } };
    });
  const anything = RINGS.some((r) => draft[r.key].words.length || draft[r.key].note.trim());

  async function keep() {
    setSaving(true);
    const res = await fetch("/api/portraits", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...Object.fromEntries(RINGS.map((r) => [r.key, { words: draft[r.key].words, note: draft[r.key].note.trim() || null }])),
        weights: draft.weights,
      }),
    });
    setSaving(false);
    if (!res.ok) return toast("Couldn't keep it. Please try again.", "error");
    await Promise.all([qc.invalidateQueries({ queryKey: ["portraits"] }), qc.invalidateQueries({ queryKey: ["notifications"] })]);
    toast("Kept", "success", 1600);
    setComposing(false);
    setDraft(EMPTY);
    window.scrollTo({ top: 0, behavior: "smooth" });
  }

  async function remove(p: PortraitDTO) {
    if (!confirm(`Remove the portrait from ${longDate(p.createdAt)}?`)) return;
    const res = await fetch("/api/portraits", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    if (!res.ok) return toast("Couldn't remove it.", "error");
    if (compareId === p.id) setCompareId(null);
    qc.invalidateQueries({ queryKey: ["portraits"] });
  }

  async function setRevisit(months: number) {
    setSavingRevisit(true);
    const res = await fetch("/api/me", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ portraitEveryMonths: months }) });
    await qc.invalidateQueries({ queryKey: ["me"] });
    setSavingRevisit(false);
    if (!res.ok) toast("Couldn't change that.", "error");
  }

  // ---------------------------------------------------------------- writing
  if (writing) {
    return (
      <Busy busy={saving} bar={false}>
        <div className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
          <div className="lg:sticky lg:top-8 flex flex-col items-center">
            <PortraitPond portrait={draft} maxWidth={440} />
          </div>
          <div className="flex flex-col gap-7">
            {RINGS.map((ring) => {
              const last = latest?.[ring.key].words ?? [];
              const chosen = draft[ring.key].words;
              return (
                <section key={ring.key}>
                  <p className="font-ui text-[11.5px] font-bold tracking-[0.14em] text-ink-soft uppercase">{ring.label}</p>
                  <h2 className="mt-1 font-display text-[21px] font-semibold text-ink">{ring.question}</h2>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {ring.words.map((w) => {
                      const on = chosen.includes(w);
                      const full = !on && chosen.length >= MAX_WORDS;
                      return (
                        <button
                          key={w}
                          type="button"
                          aria-pressed={on}
                          disabled={full}
                          onClick={() => toggleWord(ring.key, w)}
                          title={last.includes(w) ? "You chose this last time" : undefined}
                          className={cn(
                            "press relative inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-ui text-[13.5px] font-semibold border transition-colors disabled:opacity-40",
                            on ? "text-ink tone-chip" : last.includes(w) ? "border-dashed border-ink-soft/60 text-ink-soft hover:text-ink" : "border-line text-ink-soft hover:text-ink"
                          )}
                          style={toneStyle(w)}
                        >
                          {w}
                        </button>
                      );
                    })}
                    {chosen.filter((w) => !(ring.words as readonly string[]).includes(w)).map((w) => (
                      <button
                        key={w}
                        type="button"
                        aria-pressed
                        onClick={() => toggleWord(ring.key, w)}
                        title="Your word. Tap to remove."
                        className="press tone-chip inline-flex items-center gap-1.5 h-9 px-3.5 rounded-full font-ui text-[13.5px] font-semibold border text-ink"
                        style={toneStyle(w, draft.weights)}
                      >
                        {w}
                      </button>
                    ))}
                    {chosen.length < MAX_WORDS && (
                      <OwnWord
                        taken={[...ring.words, ...chosen]}
                        onAdd={(w, weight) =>
                          setDraft((d) => ({ ...d, weights: { ...d.weights, [w]: weight }, [ring.key]: { ...d[ring.key], words: [...d[ring.key].words, w] } }))
                        }
                      />
                    )}
                  </div>
                  <input
                    value={draft[ring.key].note}
                    onChange={(e) => setDraft((d) => ({ ...d, [ring.key]: { ...d[ring.key], note: e.target.value.slice(0, 240) } }))}
                    placeholder="A line about it (optional)"
                    aria-label={`${ring.label}, a line about it`}
                    className="mt-3 w-full h-11 px-4 rounded-[14px] bg-surface text-ink font-serif text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/60 placeholder:italic"
                  />
                </section>
              );
            })}
            <div className="flex gap-3">
              <Button onClick={keep} loading={saving} disabled={!anything}>Keep this portrait</Button>
              {latest && <Button variant="secondary" onClick={() => { setComposing(false); setDraft(EMPTY); }} disabled={saving}>Cancel</Button>}
            </div>
          </div>
        </div>
      </Busy>
    );
  }

  // ---------------------------------------------------------------- viewing
  return (
    <div className="flex flex-col gap-10">
      <section className="grid lg:grid-cols-[minmax(0,420px)_minmax(0,1fr)] gap-8 lg:gap-10 items-start">
        <div className="flex flex-col items-center">
          <PortraitPond portrait={latest} maxWidth={440} />
        </div>
        <div className="flex flex-col gap-4">
          <p className="font-ui text-[13px] text-ink-soft tabular">{longDate(latest.createdAt)}</p>
          {RINGS.map((ring) => (
            <div key={ring.key}>
              <p className="font-ui text-[11.5px] font-bold tracking-[0.14em] text-ink-soft uppercase">{ring.label}</p>
              <p className="font-display text-[18px] font-semibold mt-0.5"><Words words={latest[ring.key].words} weights={latest.weights} /></p>
              {latest[ring.key].note && <p className="font-serif italic text-[16px] leading-[1.55] text-ink-soft mt-0.5">{latest[ring.key].note}</p>}
            </div>
          ))}
          <div className="pt-1">
            <Button onClick={() => { setDraft(EMPTY); setComposing(true); window.scrollTo({ top: 0 }); }}>Look again</Button>
          </div>
        </div>
      </section>

      {earlier.length > 0 && (
        <section>
          <h2 className="font-display text-[19px] font-semibold text-ink mb-1">Then and now</h2>
          <p className="font-ui text-[13px] text-ink-soft mb-3">Set an earlier portrait beside today&rsquo;s.</p>
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0 pb-1">
            {earlier.map((p) => (
              <button key={p.id} type="button" aria-pressed={compareId === p.id} onClick={() => setCompareId(compareId === p.id ? null : p.id)} className={cn("press shrink-0 h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border tabular transition-colors", compareId === p.id ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink")}>
                {new Date(p.createdAt).toLocaleDateString(undefined, { month: "short", year: "numeric" })}
              </button>
            ))}
          </div>
          {compare && (
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-[22px] bg-surface p-4 sm:p-6">
              {[{ p: compare, label: "Then" }, { p: latest, label: "Now" }].map(({ p, label }) => (
                <div key={label} className="flex flex-col items-center min-w-0">
                  <p className="font-ui text-[12px] font-semibold text-ink-soft mb-2 tabular">{label} · {new Date(p.createdAt).toLocaleDateString(undefined, { day: "numeric", month: "short", year: "numeric" })}</p>
                  <PortraitPond portrait={p} maxWidth={260} compact interactive={false} />
                </div>
              ))}
              <ul className="col-span-2 mt-2 flex flex-col gap-2">
                {RINGS.map((ring) => (
                  <li key={ring.key} className="font-ui text-[13.5px] leading-[1.5]">
                    <span className="font-semibold text-ink">{ring.label}:</span>{" "}
                    <Words words={compare[ring.key].words} weights={compare.weights} className="opacity-75" />
                    <span className="text-ink-soft/60"> → </span>
                    <Words words={latest[ring.key].words} weights={latest.weights} />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </section>
      )}

      <section>
        <h2 className="font-display text-[19px] font-semibold text-ink mb-1">Ask me again</h2>
        <p className="font-ui text-[13px] text-ink-soft mb-3">A note in your bell when it&rsquo;s time to look again.</p>
        <div inert={savingRevisit} className={cn("flex flex-wrap gap-1.5 transition-opacity", savingRevisit && "opacity-60")}>
          {REVISIT_CHOICES.map((c) => (
            <button key={c.months} type="button" aria-pressed={me?.portraitEveryMonths === c.months} onClick={() => setRevisit(c.months)} className={cn("press h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors", me?.portraitEveryMonths === c.months ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink")}>
              {c.label}
            </button>
          ))}
        </div>
      </section>

      {earlier.length > 0 && (
        <section>
          <h2 className="font-display text-[19px] font-semibold text-ink mb-3">Earlier portraits</h2>
          <ul className="flex flex-col gap-2">
            {earlier.map((p) => (
              <li key={p.id} className="flex items-center gap-4 rounded-[18px] bg-surface p-3 pr-2">
                <PortraitPond portrait={p} maxWidth={96} compact interactive={false} className="shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="font-ui text-[13px] font-semibold text-ink tabular">{longDate(p.createdAt)}</p>
                  <p className="font-ui text-[12.5px] text-ink-soft truncate">{RINGS.map((r) => p[r.key].words[0]).filter(Boolean).join(" · ") || "…"}</p>
                </div>
                <button type="button" onClick={() => remove(p)} aria-label={`Remove portrait from ${longDate(p.createdAt)}`} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
                  <Trash size={16} />
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <Ornament name="divider" width={200} className="mx-auto text-ink-soft/35" />
    </div>
  );
}

/**
 * Add a word of your own, and choose its colour. The ten colours run from heavier to
 * lighter; the colour you pick is how the word sits in the water.
 */
function OwnWord({ taken, onAdd }: { taken: readonly string[]; onAdd: (word: string, weight: number) => void }) {
  const [open, setOpen] = useState(false);
  const [word, setWord] = useState("");
  const [pick, setPick] = useState<number | null>(null);
  const clean = word.trim().toLowerCase().replace(/\s+/g, " ");
  const dup = !!clean && taken.includes(clean);
  const ready = !!clean && !dup && pick !== null;

  function add() {
    if (!ready) return;
    onAdd(clean, SCALE_WEIGHTS[pick!]);
    setWord("");
    setPick(null);
    setOpen(false);
  }

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="press inline-flex items-center gap-1 h-9 px-3.5 rounded-full border border-dashed border-accent/50 font-ui text-[13.5px] font-semibold text-accent hover:bg-accent-soft">
        + Your own word
      </button>
    );
  }
  return (
    <div className="basis-full mt-1 rounded-[16px] bg-surface p-3.5 flex flex-col gap-3">
      <input
        value={word}
        onChange={(e) => setWord(e.target.value.slice(0, 24))}
        onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), add())}
        placeholder="A word of your own"
        aria-label="Your own word"
        className="w-full h-11 px-4 rounded-[12px] bg-bg text-ink font-serif text-[16px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/60 placeholder:italic"
      />
      <div>
        <p className="font-ui text-[12.5px] font-semibold text-ink mb-2">Its colour</p>
        <div role="radiogroup" aria-label="Colour, from heavier to lighter" className="grid grid-cols-10 gap-1.5">
          {WEIGHT_SCALE.map((hex, i) => (
            <button
              key={hex}
              type="button"
              role="radio"
              aria-checked={pick === i}
              aria-label={i === 0 ? "Heaviest" : i === WEIGHT_SCALE.length - 1 ? "Lightest" : `Colour ${i + 1} of ${WEIGHT_SCALE.length}`}
              onClick={() => setPick(i)}
              className={cn("press aspect-square rounded-full transition-transform", pick === i ? "scale-110 ring-2 ring-offset-2 ring-offset-surface" : "hover:scale-105")}
              style={{ background: hex, ["--tw-ring-color" as string]: hex }}
            />
          ))}
        </div>
        <div className="mt-1.5 flex justify-between font-ui text-[11.5px] text-ink-soft">
          <span>heavier</span>
          <span>lighter</span>
        </div>
      </div>
      {dup && <p className="font-ui text-[12.5px] text-ink-soft">That word is already here.</p>}
      <div className="flex gap-2">
        <Button size="sm" onClick={add} disabled={!ready}>Add</Button>
        <Button size="sm" variant="ghost" onClick={() => { setOpen(false); setWord(""); setPick(null); }}>Cancel</Button>
      </div>
    </div>
  );
}
