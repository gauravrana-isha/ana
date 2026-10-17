"use client";

import { usePersistentState } from "@/lib/persist";

import { useState, useCallback, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";

import { PromptCard } from "@/components/reflection/PromptCard";
import { DatePicker } from "@/components/ui/DatePicker";
import { ButtonLoader } from "@/components/ui/Loader";
import { Busy } from "@/components/ui/Busy";
import { WeekReview } from "@/components/weekly/WeekReview";
import { weekStart as getWeekStart, today, addDays } from "@/lib/dates";
import { fetchWeekly, saveWeekly } from "@/lib/journal";
import { useMe } from "@/lib/me";
import { readingQuestions, shownQuestions, type QuestionSets } from "@/lib/questions";
import { EditMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";
import { Segmented } from "@/components/ui/Segmented";

export default function WeeklyPage() {
  return (
    <Suspense fallback={<div className="text-ink-soft font-ui text-sm">Loading…</div>}>
      <WeeklyContent />
    </Suspense>
  );
}

function WeeklyContent() {
  const [tab, setTab] = usePersistentState("weekly.tab", "reflection", ["reflection", "digest"] as const);
  const weekParam = useSearchParams().get("week");
  const [selectedWeekStart, setSelectedWeekStart] = useState(() =>
    getWeekStart(weekParam && /^\d{4}-\d{2}-\d{2}$/.test(weekParam) && weekParam <= today() ? weekParam : today())
  );
  const qc = useQueryClient();
  const { data: me } = useMe();

  const weekEnd = addDays(selectedWeekStart, 6);
  const weekRange = (() => {
    const start = new Date(selectedWeekStart + "T12:00:00");
    const end = new Date(weekEnd + "T12:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
  })();

  const { data: reflection } = useQuery({
    queryKey: ["weekly", selectedWeekStart],
    queryFn: () => fetchWeekly(selectedWeekStart),
  });

  const mutation = useMutation({
    mutationFn: (payload: { answers: Record<string, string>; stamps: Record<string, string[]> }) => saveWeekly(selectedWeekStart, payload),
    // The reply is the saved reflection: show it directly; ask again only if saving failed.
    onSuccess: (saved) => qc.setQueryData(["weekly", selectedWeekStart], saved),
    onError: () => qc.invalidateQueries({ queryKey: ["weekly", selectedWeekStart] }),
  });

  const answers: Record<string, string> = reflection?.answers ?? {};

  // Local state for instant feedback
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localStamps, setLocalStamps] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState(false);

  // Take the saved answers into the form whenever a fresh copy arrives from the server
  // (during render, keyed on the data, rather than in an effect).
  const [syncedFrom, setSyncedFrom] = useState<unknown>(null);
  if (reflection && reflection !== syncedFrom) {
    setSyncedFrom(reflection);
    setLocalAnswers(reflection.answers ?? {});
    setLocalStamps(reflection.stamps ?? {});
    setDirty(false);
  }

  const handleAnswerChange = useCallback(
    (key: string, val: string) => {
      setLocalAnswers(prev => ({ ...prev, [key]: val }));
      setDirty(true);
    },
    []
  );

  const handleStampToggle = useCallback(
    (promptKey: string, stamp: string) => {
      setLocalStamps(prev => {
        const current = prev[promptKey] ?? [];
        const updated = current.includes(stamp)
          ? current.filter((s) => s !== stamp)
          : [...current, stamp];
        return { ...prev, [promptKey]: updated };
      });
      setDirty(true);
    },
    []
  );

  return (
    <div>
      {/* Week picker */}
      <DatePicker
        value={selectedWeekStart}
        onChange={(d) => setSelectedWeekStart(getWeekStart(d))}
        mode="week"
      />

      <Segmented
        label="Weekly"
        className="mb-[22px]"
        value={tab}
        onChange={setTab}
        options={[
          { value: "reflection", label: "Reflection" },
          { value: "digest", label: "Week in review" },
        ]}
      />

      {tab === "reflection" ? (
        <WeeklyReflectionView
          questions={me?.questions ?? null}
          localAnswers={localAnswers}
          localStamps={localStamps}
          serverAnswers={answers}
          dirty={dirty}
          isPending={mutation.isPending}
          onAnswerChange={handleAnswerChange}
          onStampToggle={handleStampToggle}
          onSave={() => mutation.mutate({ answers: localAnswers, stamps: localStamps })}
        />
      ) : (
        <WeekReview weekStart={selectedWeekStart} weekRange={weekRange} />
      )}
    </div>
  );
}

function WeeklyReflectionView({
  questions,
  localAnswers,
  localStamps,
  serverAnswers,
  dirty,
  isPending,
  onAnswerChange,
  onStampToggle,
  onSave,
}: {
  questions: QuestionSets | null;
  localAnswers: Record<string, string>;
  localStamps: Record<string, string[]>;
  serverAnswers: Record<string, string>;
  dirty: boolean;
  isPending: boolean;
  onAnswerChange: (key: string, val: string) => void;
  onStampToggle: (key: string, stamp: string) => void;
  onSave: () => void;
}) {
  const [editing, setEditing] = useState(true);
  const prompts = shownQuestions("weekly", questions);
  const hasSavedData = Object.values(serverAnswers).some(v => v && v.trim().length > 0);

  // If saved and not dirty, show read-only view
  const showSavedView = hasSavedData && !dirty && !editing;

  if (showSavedView) {
    return (
      <div className="pb-20">
        {readingQuestions("weekly", questions, Object.keys(serverAnswers)).map((prompt) => {
          const answer = serverAnswers[prompt.key];
          if (!answer) return null;
          return (
            <div key={prompt.key} className="rounded-16 p-5 mb-3.5 bg-surface">
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
                  <p className="font-serif text-base leading-[1.7] text-ink mt-2 first:mt-0">
                    {answer}
                  </p>
                </div>
              </div>
            </div>
          );
        })}

        {/* Edit button */}
        <button
          onClick={() => setEditing(true)}
          className="ana-fab fixed bottom-[80px] right-6 lg:bottom-8 lg:right-8
                     w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                     shadow-[0_6px_16px_var(--accent-soft)] z-20"
          aria-label="Edit reflection"
        >
          <EditMark size={24} />
        </button>
      </div>
    );
  }

  return (
    <Busy busy={isPending} className="pb-20">
      {prompts.map((prompt, i) => (
        <PromptCard
          key={prompt.key}
          number={String(i + 1)}
          question={prompt.q}
          hint={prompt.hint}
          answer={localAnswers[prompt.key] ?? ""}
          stamps={localStamps[prompt.key] ?? []}
          onAnswerChange={(val) => onAnswerChange(prompt.key, val)}
          onStampToggle={(stamp) => onStampToggle(prompt.key, stamp)}
        />
      ))}

      {/* Floating save */}
      {dirty && (
        <button
          onClick={() => { onSave(); setEditing(false); }}
          disabled={isPending}
          className="ana-fab fixed bottom-[80px] right-6 lg:bottom-8 lg:right-8
                     w-12 h-12 rounded-full bg-accent text-bg grid place-items-center
                     shadow-[0_6px_16px_var(--accent-soft)] z-20
                     disabled:opacity-50 transition-opacity"
          aria-label="Save reflection"
        >
          {isPending ? <ButtonLoader /> : <Glyph k="save" size={24} />}
        </button>
      )}
    </Busy>
  );
}

