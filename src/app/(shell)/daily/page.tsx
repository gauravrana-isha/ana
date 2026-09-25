"use client";

import { Ornament } from "@/components/art/Ornament";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import { ButtonLoader } from "@/components/ui/Loader";
import { Busy } from "@/components/ui/Busy";
import { MoodBadge, type MoodKey } from "@/components/art/MoodFace";
import { PromptCard } from "@/components/reflection/PromptCard";
import { MoodPicker } from "@/components/reflection/MoodPicker";
import { ReflectionSkeleton } from "@/components/ui/Skeleton";
import { useQuote } from "@/lib/queries";
import { today } from "@/lib/dates";

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
    <Suspense fallback={<ReflectionSkeleton />}>
      <DailyContent />
    </Suspense>
  );
}

function DailyContent() {
  // ?date=YYYY-MM-DD opens an earlier day (e.g. from search); otherwise today.
  const param = useSearchParams().get("date");
  const [date] = useState(() => (param && /^\d{4}-\d{2}-\d{2}$/.test(param) && param <= today() ? param : today()));
  const qc = useQueryClient();
  const [editing, setEditing] = useState(false);
  const [dirty, setDirty] = useState(false);
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localStamps, setLocalStamps] = useState<Record<string, string[]>>({});
  const [localMood, setLocalMood] = useState<string | null>(null);

  const { data: quoteData } = useQuote(date);
  const { data: reflection, isLoading } = useQuery({
    queryKey: ["daily", date],
    queryFn: async () => {
      const res = await fetch(`/api/daily/${date}`);
      return res.json();
    },
  });

  const serverAnswers: Record<string, string> = reflection?.answers ?? {};
  const serverStamps: Record<string, string[]> = reflection?.stamps ?? {};
  const serverMood: string | null = reflection?.moodKey ?? null;
  const hasSavedData = Object.values(serverAnswers).some(v => v.trim().length > 0);

  // Initialize local state from server
  useEffect(() => {
    if (reflection) {
      setLocalAnswers(reflection.answers ?? {});
      setLocalStamps(reflection.stamps ?? {});
      setLocalMood(reflection.moodKey ?? null);
      setDirty(false);
    }
  }, [reflection]);

  const mutation = useMutation({
    mutationFn: async () => {
      const res = await fetch(`/api/daily/${date}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          answers: localAnswers,
          stamps: localStamps,
          moodKey: localMood,
        }),
      });
      return res.json();
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["daily", date] });
      setDirty(false);
      setEditing(false);
    },
  });

  const handleAnswerChange = useCallback((key: string, val: string) => {
    setLocalAnswers(prev => ({ ...prev, [key]: val }));
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
    setDirty(true);
  }, []);

  const handleMoodChange = useCallback((mood: string | null) => {
    setLocalMood(mood);
    setDirty(true);
  }, []);

  // If there's saved data and user hasn't entered edit mode, show saved view
  const showSavedView = hasSavedData && !editing;

  if (isLoading) return <ReflectionSkeleton />;

  return (
    <div className="pb-20">
      {/* Quote */}
      {quoteData?.quote && (
        <div className="mb-4">
          <p className="font-serif italic text-lg leading-[1.6] text-ink">
            &ldquo;{quoteData.quote}&rdquo;
          </p>
          <Ornament name="divider" width={220} className="mx-auto my-6 text-ink-soft/40" />
        </div>
      )}

      {/* Title */}
      <h2 className="font-display text-[19px] font-semibold text-ink mb-4">Reflection</h2>

      {showSavedView ? (
        /* Saved view — show answers as read-only cards with edit button */
        <>
          {DAILY_PROMPTS.map((prompt) => {
            const answer = serverAnswers[prompt.key];
            const stamps = serverStamps[prompt.key] ?? [];
            if (!answer && stamps.length === 0) return null;
            return (
              <div key={prompt.key} className="rounded-16 p-5 mb-3.5 bg-surface relative">
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
                  </div>
                </div>
              </div>
            );
          })}

          {serverMood && (
            <div className="rounded-16 p-4 bg-surface mb-3 flex items-center gap-2">
              <MoodIcon mood={serverMood} />
              <span className="font-serif text-sm text-accent capitalize">{serverMood}</span>
            </div>
          )}

          {/* Edit button */}
          <button
            onClick={() => setEditing(true)}
            className="ana-fab fixed bottom-[88px] right-6 lg:bottom-8 lg:right-8
                       w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                       shadow-[0_6px_16px_var(--accent-soft)] z-20"
            aria-label="Edit reflection"
          >
            <PencilSimple size={22} weight="thin" />
          </button>
        </>
      ) : (
        /* Edit view — input cards */
        <Busy busy={mutation.isPending}>
          {DAILY_PROMPTS.map((prompt) => (
            <PromptCard
              key={prompt.key}
              number={prompt.key}
              question={prompt.q}
              hint={prompt.hint}
              answer={localAnswers[prompt.key] ?? ""}
              stamps={localStamps[prompt.key] ?? []}
              onAnswerChange={(val) => handleAnswerChange(prompt.key, val)}
              onStampToggle={(stamp) => handleStampToggle(prompt.key, stamp)}
            />
          ))}

          {/* Mood picker */}
          <div className="mt-4">
            <MoodPicker value={localMood} onChange={handleMoodChange} />
          </div>

          {/* Floating save button */}
          {dirty && (
            <button
              onClick={() => mutation.mutate()}
              disabled={mutation.isPending}
              className="ana-fab fixed bottom-[88px] right-6 lg:bottom-8 lg:right-8
                         w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                         shadow-[0_6px_16px_var(--accent-soft)] z-20
                         disabled:opacity-50 transition-opacity"
              aria-label="Save reflection"
            >
              {mutation.isPending ? <ButtonLoader /> : <FloppyDisk size={22} weight="thin" />}
            </button>
          )}
        </Busy>
      )}
    </div>
  );
}

function MoodIcon({ mood }: { mood: string }) {
  return ["low", "agitated", "neutral", "content", "blissful"].includes(mood) ? <MoodBadge k={mood as MoodKey} size={30} /> : null;
}
