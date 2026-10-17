"use client";

import { Ornament } from "@/components/art/Ornament";

import { useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { PencilSimple } from "@phosphor-icons/react";
import { MoodBadge, type MoodKey } from "@/components/art/MoodFace";
import { ReflectionStepper } from "@/components/reflection/ReflectionStepper";
import { PromptCard } from "@/components/reflection/PromptCard";
import { MoodPicker } from "@/components/reflection/MoodPicker";
import { StampChip } from "@/components/art/StampIcon";
import { Busy } from "@/components/ui/Busy";
import { Button } from "@/components/ui/Button";
import { DailySkeleton } from "@/components/skeletons/DailySkeleton";
import { useQuote } from "@/lib/queries";
import { today } from "@/lib/dates";
import { fetchDaily, saveDaily } from "@/lib/journal";

const DAILY_PROMPTS = [
  { key: "1", q: "How many times a day am I doing the Inner Engineering Crash Course?", hint: undefined },
  { key: "2", q: "Am I eating more consciously?", hint: "Aware of chewing count, texture, quantity; eating with gratitude, setting aside likes/dislikes." },
  { key: "3", q: "Am I reacting or responding to people around me?", hint: "How often angry/impatient/irritated; do I see all I experience is my making?" },
  { key: "4", q: "Am I becoming more willing?", hint: "(a) First feeling/thought on receiving instructions; (b) can I set myself aside and act with a sense of offering; (c) would I act the same if someone were watching?" },
  { key: "5", q: "Is my system more vibrant or dull?", hint: "Energetic all day? Ease of waking?" },
  { key: "6", q: "How well am I maintaining Vak Shuddhi?", hint: "Fewer words; conscious word choice and intention; silence after 9:30pm?" },
  { key: "7", q: "Am I staying more focused throughout the day?", hint: "Is focus becoming effortless, or must I remind myself?" },
];

export default function DailyPage() {
  return (
    <Suspense fallback={<DailySkeleton />}>
      <DailyContent />
    </Suspense>
  );
}

function DailyContent() {
  // ?date=YYYY-MM-DD opens an earlier day (e.g. from search); otherwise today.
  const param = useSearchParams().get("date");
  const [date] = useState(() => (param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today() ? param : today()));
  const qc = useQueryClient();
  // null: reading. "first": a day with nothing saved, answered one question at a time.
  // A prompt key (or "mood"): changing a saved day, in the full editor, scrolled to that item.
  const [editing, setEditing] = useState<null | "first" | string>(null);
  const edits = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localStamps, setLocalStamps] = useState<Record<string, string[]>>({});
  const [localMood, setLocalMood] = useState<string | null>(null);

  const { data: quoteData } = useQuote(date);
  const { data: reflection, isPending: isLoading } = useQuery({
    queryKey: ["daily", date],
    queryFn: () => fetchDaily(date),
  });

  const serverAnswers: Record<string, string> = reflection?.answers ?? {};
  const serverStamps: Record<string, string[]> = reflection?.stamps ?? {};
  const serverMood: string | null = reflection?.moodKey ?? null;

  // Take the saved answers into the form whenever a fresh copy arrives from the server.
  // (Adjusting state during render, keyed on the data, instead of in an effect: no extra pass.)
  const [syncedFrom, setSyncedFrom] = useState<unknown>(null);
  if (reflection && reflection !== syncedFrom) {
    // First copy of a day with nothing saved: open the stepper at the first question, and
    // keep it open (even as answers save between steps) until Save.
    if (syncedFrom === null && !hasAnything(reflection)) setEditing("first");
    setSyncedFrom(reflection);
    setLocalAnswers(reflection.answers ?? {});
    setLocalStamps(reflection.stamps ?? {});
    setLocalMood(reflection.moodKey ?? null);
    setDirty(false);
  }

  // Saves what's been written so far. The server merges, so partial saves are safe. `close`
  // finishes the reflection; otherwise it's a quiet save between questions.
  const mutation = useMutation({
    mutationFn: async ({ version }: { close: boolean; version: number }) => {
      const saved = await saveDaily(date, { answers: localAnswers, stamps: localStamps, moodKey: localMood });
      return { saved, version };
    },
    onSuccess: ({ saved, version }, { close }) => {
      // The reply is the saved reflection: keep it as the cached copy without re-reading it
      // into the form (that would undo anything typed while the save was in flight).
      qc.setQueryData(["daily", date], saved);
      setSyncedFrom(qc.getQueryData(["daily", date]));
      if (version === edits.current) setDirty(false);
      if (close) setEditing(null);
      // Today shows "x of 7 answered", Profile counts reflection days: refresh both.
      qc.invalidateQueries({ queryKey: ["today"] });
      qc.invalidateQueries({ queryKey: ["profile-stats"] });
    },
  });
  const save = (close: boolean) => mutation.mutate({ close, version: edits.current });

  const handleAnswerChange = useCallback((key: string, val: string) => {
    setLocalAnswers(prev => ({ ...prev, [key]: val }));
    edits.current++;
    setDirty(true);
  }, []);

  const handleStampToggle = useCallback((promptKey: string, stamp: string) => {
    setLocalStamps(prev => {
      const current = prev[promptKey] ?? [];
      const updated = current.includes(stamp)
        ? current.filter((s) => s !== stamp)
        : [...current, stamp];
      return { ...prev, [promptKey]: updated };
    });
    edits.current++;
    setDirty(true);
  }, []);

  const handleMoodChange = useCallback((mood: string | null) => {
    setLocalMood(mood);
    edits.current++;
    setDirty(true);
  }, []);

  // If there's saved data and user hasn't entered edit mode, show saved view
  const showSavedView = editing === null;

  if (isLoading) return <DailySkeleton date={date} />;

  return (
    <div className="pb-20">
      {/* Quote */}
      {/* Quote and heading frame the read-back; while answering, the question has the room. */}
      {showSavedView && quoteData?.quote && (
        <div className="mb-4">
          <p className="font-serif italic text-lg leading-[1.6] text-ink">
            &ldquo;{quoteData.quote}&rdquo;
          </p>
          <Ornament name="divider" width={220} className="mx-auto my-6 text-ink-soft/40" />
        </div>
      )}

      {/* Title */}
      {showSavedView && <h2 className="font-display text-[19px] font-semibold text-ink mb-4">Reflection</h2>}

      {showSavedView ? (
        /* Saved view — show answers as read-only cards with edit button */
        <>
          {DAILY_PROMPTS.map((prompt) => {
            const answer = serverAnswers[prompt.key];
            const stamps = serverStamps[prompt.key] ?? [];
            if (!answer && stamps.length === 0) return null;
            return (
              <button type="button" key={prompt.key} onClick={() => setEditing(prompt.key)} aria-label={`Edit: ${prompt.q}`} className="press block w-full text-left rounded-16 p-5 mb-3.5 bg-surface hover:bg-surface-2 transition-colors relative">
                <div className="flex gap-3 items-start">
                  <span className="font-ui text-[13px] font-semibold leading-[1.9] text-ink-soft/70 shrink-0 min-w-[22px] tabular">
                    {prompt.key}
                  </span>
                  <div className="flex-1">
                    <p className="font-serif text-base font-medium leading-[1.4] text-ink-soft">
                      {prompt.q}
                    </p>
                    {answer && (
                      <p className="font-serif text-base leading-[1.7] text-ink mt-2">
                        {answer}
                      </p>
                    )}
                    {stamps.length > 0 && (
                      <span className="mt-3 flex flex-wrap gap-1.5">
                        {stamps.map((st) => (
                          <StampChip key={st} k={st} size="sm" />
                        ))}
                      </span>
                    )}
                  </div>
                </div>
              </button>
            );
          })}

          {serverMood && (
            <button type="button" onClick={() => setEditing("mood")} aria-label="Edit mood" className="press w-full text-left rounded-16 p-4 bg-surface hover:bg-surface-2 transition-colors mb-3 flex items-center gap-2">
              <MoodIcon mood={serverMood} />
              <span className="font-serif text-sm text-accent capitalize">{serverMood}</span>
            </button>
          )}

          {/* Edit button */}
          <button
            onClick={() => setEditing(DAILY_PROMPTS[0].key)}
            className="ana-fab fixed bottom-[88px] right-6 lg:bottom-8 lg:right-8
                       w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                       shadow-[0_6px_16px_var(--accent-soft)] z-20"
            aria-label="Edit reflection"
          >
            <PencilSimple size={22} weight="thin" />
          </button>
        </>
      ) : (
        editing === "first" ? (
        /* First time today: one question at a time */
        <ReflectionStepper
          prompts={DAILY_PROMPTS}
          answers={localAnswers}
          stamps={localStamps}
          mood={localMood}
          startAt={0}
          saving={mutation.isPending && mutation.variables?.close === true}
          onAnswer={handleAnswerChange}
          onStamp={handleStampToggle}
          onMood={handleMoodChange}
          onStep={() => dirty && save(false)}
          onDone={() => save(true)}
        />
        ) : (
        /* Changing a saved day: every question on one page, opened at the one tapped */
        <Busy busy={mutation.isPending}>
          {DAILY_PROMPTS.map((prompt) => (
            <div key={prompt.key} ref={editing === prompt.key ? scrollIntoView : undefined}>
              <PromptCard
                number={prompt.key}
                question={prompt.q}
                hint={prompt.hint}
                answer={localAnswers[prompt.key] ?? ""}
                stamps={localStamps[prompt.key] ?? []}
                onAnswerChange={(val) => handleAnswerChange(prompt.key, val)}
                onStampToggle={(stamp) => handleStampToggle(prompt.key, stamp)}
              />
            </div>
          ))}
          <div className="mt-4" ref={editing === "mood" ? scrollIntoView : undefined}>
            <MoodPicker value={localMood} onChange={handleMoodChange} />
          </div>
          <div className="mt-6 flex justify-end gap-3">
            <Button variant="secondary" onClick={() => { setEditing(null); setSyncedFrom(null); }} disabled={mutation.isPending}>Cancel</Button>
            <Button onClick={() => save(true)} loading={mutation.isPending}>Save</Button>
          </div>
        </Busy>
        )
      )}
    </div>
  );
}


/** Bring the item that was tapped into view once the editor opens. */
function scrollIntoView(el: HTMLElement | null) {
  if (el) requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "smooth" }));
}

type Saved = { answers?: Record<string, string>; stamps?: Record<string, string[]>; moodKey?: string | null };

function hasAnything(r: Saved) {
  return (
    Object.values(r.answers ?? {}).some((v) => v.trim().length > 0) ||
    Object.values(r.stamps ?? {}).some((v) => v.length > 0) ||
    !!r.moodKey
  );
}

function MoodIcon({ mood }: { mood: string }) {
  return ["low", "agitated", "neutral", "content", "blissful"].includes(mood) ? <MoodBadge k={mood as MoodKey} size={30} /> : null;
}
