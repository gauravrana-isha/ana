"use client";


import { useState, useCallback, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { MoodBadge, type MoodKey } from "@/components/art/MoodFace";
import { ReflectionStepper } from "@/components/reflection/ReflectionStepper";
import { PromptCard } from "@/components/reflection/PromptCard";
import { MoodPicker } from "@/components/reflection/MoodPicker";
import { StampChip } from "@/components/art/StampIcon";
import { Busy } from "@/components/ui/Busy";
import { Button } from "@/components/ui/Button";
import { DailySkeleton } from "@/components/skeletons/DailySkeleton";
import { formatDateHand, today } from "@/lib/dates";
import { fetchDaily, saveDaily } from "@/lib/journal";
import { useMe } from "@/lib/me";
import { readingQuestions, shownQuestions } from "@/lib/questions";
import { EditMark } from "@/components/art/PenMarks";
import { Portal } from "@/components/ui/Portal";

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
  const { data: me } = useMe();
  const prompts = shownQuestions("daily", me?.questions);
  // null: reading. "first": a day with nothing saved, answered one question at a time.
  // A prompt key (or "mood"): changing a saved day, in the full editor, scrolled to that item.
  const [editing, setEditing] = useState<null | "first" | string>(null);
  // The question tapped to open the editor: its answer gets the cursor.
  const [focusKey, setFocusKey] = useState<string | null>(null);
  const edits = useRef(0);
  const [dirty, setDirty] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localStamps, setLocalStamps] = useState<Record<string, string[]>>({});
  const [localMood, setLocalMood] = useState<string | null>(null);

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

  if (isLoading || !me) return <DailySkeleton date={date} />;

  return (
    <div className="pb-20">
      {/* A past day (opened from search) says which day it is; today needs no label. */}
      {date !== today() && (
        <p className="mb-4 inline-flex items-center gap-1.5 font-ui text-[13px] font-medium text-ink-soft tabular">
          <span className="w-1.5 h-1.5 rounded-full bg-saffron" aria-hidden="true" />
          {formatDateHand(date).replace(" · ", ", ")}
        </p>
      )}

      {showSavedView ? (
        /* Saved view — show answers as read-only cards with edit button */
        <>
          {readingQuestions("daily", me.questions, [...Object.keys(serverAnswers), ...Object.keys(serverStamps)]).map((prompt) => {
            const answer = serverAnswers[prompt.key];
            const stamps = serverStamps[prompt.key] ?? [];
            if (!answer && stamps.length === 0) return null;
            return (
              <button type="button" key={prompt.key} onClick={() => { setFocusKey(prompt.key); setEditing(prompt.key); }} aria-label={prompt.q ? `Edit: ${prompt.q}` : "Edit reflection"} className="press block w-full text-left rounded-16 p-5 mb-3.5 bg-surface hover:bg-surface-2 transition-colors relative">
                <div className="flex gap-3 items-start">
                  <span className="font-ui text-[13px] font-semibold leading-[1.9] text-ink-soft/70 shrink-0 min-w-[22px] tabular">
                    {prompt.number}
                  </span>
                  <div className="flex-1">
                    {prompt.q && (
                      <p className="font-serif text-base font-medium leading-[1.4] text-ink-soft">
                        {prompt.q}
                      </p>
                    )}
                    {answer && (
                      <p className="font-serif text-base leading-[1.7] text-ink mt-2 first:mt-0">
                        {answer}
                      </p>
                    )}
                    {stamps.length > 0 && (
                      <span className="mt-3 first:mt-0 flex flex-wrap gap-1.5">
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
            <button type="button" onClick={() => { setFocusKey(null); setEditing("mood"); }} aria-label="Edit mood" className="press w-full text-left rounded-16 p-4 bg-surface hover:bg-surface-2 transition-colors mb-3 flex items-center gap-2">
              <MoodIcon mood={serverMood} />
              <span className="font-serif text-sm text-accent capitalize">{serverMood}</span>
            </button>
          )}

          {/* Edit button */}
          <Portal>
            <button
              onClick={() => { setFocusKey(null); setEditing(prompts[0].key); }}
              className="ana-fab fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-6 lg:bottom-8 lg:right-8
                         w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                         shadow-[0_6px_16px_var(--accent-soft)] z-20"
              aria-label="Edit reflection"
            >
              <EditMark size={24} />
            </button>
          </Portal>
        </>
      ) : (
        editing === "first" ? (
        /* First time today: one question at a time */
        <ReflectionStepper
          prompts={prompts}
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
        /* Changing a saved day: a page of its own (no tab bar), every question on it, opened at
           the one tapped (with the cursor in it), and Cancel / Save pinned at the bottom. */
        <div data-bare className="pb-24 lg:pb-0">
        <Busy busy={mutation.isPending}>
          {/* The questions asked now, then any others this day has answers for (hidden or removed since). */}
          {readingQuestions("daily", me.questions, [...Object.keys(serverAnswers), ...Object.keys(serverStamps)]).map((prompt) => (
            <div key={prompt.key} ref={editing === prompt.key && focusKey !== prompt.key ? scrollIntoView : undefined}>
              <PromptCard
                focus={focusKey === prompt.key}
                number={prompt.number}
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
        </Busy>
          <div className="fixed lg:sticky inset-x-0 bottom-0 z-30 mt-6 bg-bg/95 backdrop-blur-md border-t border-line lg:border lg:rounded-[18px] lg:bottom-4 pt-3 pb-[max(12px,env(safe-area-inset-bottom))] lg:pb-3">
            <div className="max-w-[860px] mx-auto px-4 sm:px-6 lg:px-4 flex justify-end gap-3">
              <Button variant="secondary" className="flex-1 sm:flex-none" onClick={() => { setEditing(null); setSyncedFrom(null); }} disabled={mutation.isPending}>Cancel</Button>
              <Button className="flex-1 sm:flex-none" onClick={() => save(true)} loading={mutation.isPending}>Save</Button>
            </div>
          </div>
        </div>
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
