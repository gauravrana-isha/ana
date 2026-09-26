"use client";

import { Busy, BusyBar } from "@/components/ui/Busy";

import { useEffect, useState } from "react";
import { HELP_EVENT } from "@/components/shell/Topbar";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CaretDown, PencilSimple } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Sheet";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { usePersistentState } from "@/lib/persist";
import { NotifyNudge } from "@/components/push/Notifications";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { Loader } from "@/components/ui/Loader";
import { useToast } from "@/components/ui/Toast";
import { useMe } from "@/lib/me";
import { cn } from "@/lib/utils";

interface Letter {
  id: string;
  body: string;
  revisit: "monthly" | "quarterly" | "never";
  revisitedAt: string | null;
  createdAt: string;
  supersededAt: string | null;
}

const REVISIT = [
  { id: "monthly", label: "Every month" },
  { id: "quarterly", label: "Every three months" },
  { id: "never", label: "Only when I open it" },
] as const;

const PROMPTS = [
  "What am I committing to, in my sadhana and in my life?",
  "Why does it matter to me?",
  "What will I do on the days it is hard?",
];

function longDate(iso: string) {
  return new Date(iso).toLocaleDateString(undefined, { day: "numeric", month: "long", year: "numeric" });
}

export default function CommitmentPage() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: me } = useMe();
  const { data, isLoading } = useQuery({
    queryKey: ["commitment"],
    queryFn: async (): Promise<{ current: Letter | null; due: boolean; history: Letter[] }> => (await fetch("/api/commitment")).json(),
  });
  const [writing, setWriting] = useState(false);
  const [draft, setDraft] = useState("");
  const [revisit, setRevisit] = useState<Letter["revisit"]>("monthly");
  const [saving, setSaving] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [patching, setPatching] = useState(false);
  // What a commitment letter is, explained once (the first visit before any letter exists),
  // then only when asked for.
  const [introSeen, setIntroSeen] = usePersistentState("commitment.intro", "no", ["no", "yes"] as const);
  const [introAsked, setIntroAsked] = useState(false);
  // The ⓘ beside the date in the header opens it again.
  useEffect(() => {
    const open = () => setIntroAsked(true);
    window.addEventListener(HELP_EVENT, open);
    return () => window.removeEventListener(HELP_EVENT, open);
  }, []);

  if (isLoading || !data) return <div className="py-20 grid place-items-center"><Loader /></div>;
  const current = data.current;
  const editing = writing || !current;
  const introOpen = introAsked || (!current && introSeen === "no");
  const closeIntro = () => { setIntroSeen("yes"); setIntroAsked(false); };

  async function save() {
    if (!draft.trim()) return;
    setSaving(true);
    const res = await fetch("/api/commitment", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ body: draft.trim(), revisit }),
    });
    setSaving(false);
    if (!res.ok) return toast("Couldn't save. Please try again.", "error");
    toast(current ? "Your new letter is kept" : "Your letter is kept", "success", 2000);
    setWriting(false);
    qc.invalidateQueries({ queryKey: ["commitment"] });
    qc.invalidateQueries({ queryKey: ["today"] });
  }

  async function patch(body: object) {
    if (patching) return;
    setPatching(true);
    const res = await fetch("/api/commitment", { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) });
    if (!res.ok) toast("Couldn't update. Please try again.", "error");
    await Promise.all([qc.invalidateQueries({ queryKey: ["commitment"] }), qc.invalidateQueries({ queryKey: ["today"] })]);
    setPatching(false);
  }

  return (
    <div className="flex flex-col gap-8">
      {editing ? (
        <Busy busy={saving} bar={false}>
        <section className="flex flex-col gap-5">
          {current && (
            <p className="-mt-3 font-serif italic text-[17px] text-ink-soft max-w-[56ch]">Write it again as it is now. The earlier letter is kept below.</p>
          )}
          <div className="relative rounded-[22px] bg-surface px-5 py-5 sm:px-8 sm:py-7 overflow-hidden">
            <BusyBar show={saving} className="absolute top-0 inset-x-6" />
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value.slice(0, 8000))}
              rows={12}
              // Desktop starts ready to type; phones wait for a tap (no keyboard popping up unasked).
              ref={(el) => {
                if (el && !el.dataset.focused && window.matchMedia("(min-width: 1024px)").matches) {
                  el.dataset.focused = "1";
                  el.focus();
                }
              }}
              placeholder="Dear me,"
              aria-label="Your commitment"
              className="w-full bg-transparent resize-none outline-none focus-visible:outline-none font-serif text-[18px] leading-[1.75] text-ink placeholder:text-ink-soft/60 placeholder:italic"
            />
          </div>
          <div>
            <span className="font-ui text-[13px] font-semibold text-ink">Bring it back to me</span>
            <div className="mt-2 flex flex-wrap gap-1.5">
              {REVISIT.map((r) => (
                <button key={r.id} type="button" aria-pressed={revisit === r.id} onClick={() => setRevisit(r.id)} className={cn("press h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors", revisit === r.id ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink")}>
                  {r.label}
                </button>
              ))}
            </div>
            <NotifyNudge show={revisit !== "never"} what="it's time to read it again" />
          </div>
          <div className="flex gap-3">
            <Button onClick={save} loading={saving} disabled={!draft.trim()}>Keep this letter</Button>
            {current && <Button variant="secondary" onClick={() => setWriting(false)}>Cancel</Button>}
          </div>
        </section>
        </Busy>
      ) : (
        <section>
          <article className="relative rounded-[22px] bg-surface px-6 py-7 sm:px-10 sm:py-10 overflow-hidden">
            <Ornament name="vine" width={150} className="text-accent/60 mb-6" />
            <p className="font-ui text-[13px] text-ink-soft tabular mb-4">{longDate(current.createdAt)}</p>
            <div className="font-serif text-[18.5px] sm:text-[19.5px] leading-[1.8] text-ink whitespace-pre-line max-w-[62ch]">{current.body}</div>
            <p className="mt-8 font-display italic text-[18px] text-ink-soft">{me?.name ?? ""}</p>
          </article>

          <div inert={patching} aria-busy={patching || undefined} className={cn("mt-5 flex flex-col sm:flex-row sm:items-center gap-4 justify-between transition-opacity", patching && "opacity-60")}>
            <div>
              <span className="font-ui text-[13px] font-semibold text-ink">Comes back to me</span>
              <div className="mt-2 flex flex-wrap gap-1.5">
                {REVISIT.map((r) => (
                  <button key={r.id} type="button" aria-pressed={current.revisit === r.id} onClick={() => patch({ revisit: r.id })} className={cn("press h-9 px-3.5 rounded-full font-ui text-[13px] font-semibold border transition-colors", current.revisit === r.id ? "bg-accent text-bg border-accent" : "border-line text-ink-soft hover:text-ink")}>
                    {r.label}
                  </button>
                ))}
              </div>
              <NotifyNudge show={current.revisit !== "never"} what="it's time to read it again" />
            </div>
            <div className="flex gap-2">
              {data.due && <Button variant="secondary" onClick={() => patch({ revisited: true })}>I&rsquo;ve read it again</Button>}
              <Button variant="ghost" onClick={() => { setDraft(current.body); setRevisit(current.revisit); setWriting(true); }}>
                <PencilSimple size={16} /> Rewrite
              </Button>
            </div>
          </div>
        </section>
      )}

      {data.history.length > 0 && (
        <section>
          <button type="button" onClick={() => setShowHistory((s) => !s)} aria-expanded={showHistory} className="press inline-flex items-center gap-2 h-10 px-1 font-ui text-[14px] font-semibold text-ink-soft hover:text-ink">
            <CaretDown size={16} className={cn("transition-transform", showHistory && "rotate-180")} />
            Earlier letters ({data.history.length})
          </button>
          {showHistory && (
            <ul className="mt-3 flex flex-col gap-3">
              {data.history.map((l) => (
                <li key={l.id} className="rounded-[18px] border border-line p-5">
                  <p className="font-ui text-[12.5px] text-ink-soft tabular mb-2">{longDate(l.createdAt)} – {longDate(l.supersededAt!)}</p>
                  <p className="font-serif text-[16px] leading-[1.7] text-ink-soft whitespace-pre-line">{l.body}</p>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}

      <Sheet
        open={introOpen}
        onClose={closeIntro}
        title="Your commitment"
        footer={<div className="flex justify-end"><Button onClick={closeIntro}>Begin the letter</Button></div>}
      >
        <div className="flex flex-col gap-5">
          <FeatureBadge k="commitment" size={56} />
          <p className="font-serif text-[18px] leading-[1.65] text-ink">
            A letter to yourself about what you are committing to. Not for any program, not for anyone else.
          </p>
          <p className="font-ui text-[14.5px] leading-[1.6] text-ink-soft">
            It comes back to you when you choose: every month, every three months, or only when you open it. Rewriting keeps the earlier letters, so you can see how it changes.
          </p>
          <div>
            <p className="font-ui text-[13px] font-semibold text-ink mb-2">If you don&rsquo;t know where to start</p>
            <ul className="flex flex-col gap-1.5 font-ui text-[14px] text-ink-soft">
              {PROMPTS.map((p) => (
                <li key={p} className="flex gap-2"><span className="text-accent">·</span>{p}</li>
              ))}
            </ul>
          </div>
        </div>
      </Sheet>
    </div>
  );
}
