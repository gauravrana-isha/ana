"use client";

import { usePersistentState } from "@/lib/persist";

import { useState, useCallback, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { FloppyDisk, PencilSimple } from "@phosphor-icons/react";
import { PromptCard } from "@/components/reflection/PromptCard";
import { DatePicker } from "@/components/ui/DatePicker";
import { ButtonLoader } from "@/components/ui/Loader";
import { Busy } from "@/components/ui/Busy";
import { WeekReview } from "@/components/weekly/WeekReview";
import { weekStart as getWeekStart, today, addDays } from "@/lib/dates";
import { cn } from "@/lib/utils";

const WEEKLY_PROMPTS = [
  { key: "1", q: "How is my experience of Sadhana?", hint: "Sitting still with more ease, for longer? Stronger? During or after Pradakshina?" },
  { key: "2", q: "Am I making Bhakti Sadhana part of my life?", hint: "Seeing something higher than myself? Seeing the best in people?" },
  { key: "3", q: "Is my commitment toward my growth unwavering?", hint: "Even when unwell, can I use the situation for growth?" },
  { key: "4", q: "Am I experiencing an effortless sense of joy and love?", hint: "Irrespective of the situation — am I smiling naturally?" },
  { key: "5", q: "How often am I part of the problem, and how often part of the solution?" },
  { key: "6", q: "Am I feeling more balanced and still within?", hint: "Regardless of body, mind, or surroundings?" },
  { key: "7", q: "What is my current level of intensity in seva?", hint: "Am I giving myself fully to what needs to happen?" },
  { key: "8", q: "What is holding me back from being more intense in seva?", hint: "Body, mind, emotion, or situation?" },
  { key: "9", q: "What can I do to enhance my intensity?", hint: "One concrete step for the coming week." },
];

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

  const weekEnd = addDays(selectedWeekStart, 6);
  const weekRange = (() => {
    const start = new Date(selectedWeekStart + "T12:00:00");
    const end = new Date(weekEnd + "T12:00:00");
    const months = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    return `${months[start.getMonth()]} ${start.getDate()} – ${months[end.getMonth()]} ${end.getDate()}`;
  })();

  const { data: reflection } = useQuery({
    queryKey: ["weekly", selectedWeekStart],
    queryFn: async () => {
      const res = await fetch(`/api/weekly/${selectedWeekStart}`);
      return res.json();
    },
  });

  const mutation = useMutation({
    mutationFn: async (payload: Record<string, unknown>) => {
      const res = await fetch(`/api/weekly/${selectedWeekStart}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      return res.json();
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["weekly", selectedWeekStart] }),
  });

  const answers: Record<string, string> = reflection?.answers ?? {};
  const stamps: Record<string, string[]> = reflection?.stamps ?? {};

  // Local state for instant feedback
  const [localAnswers, setLocalAnswers] = useState<Record<string, string>>({});
  const [localStamps, setLocalStamps] = useState<Record<string, string[]>>({});
  const [dirty, setDirty] = useState(false);

  // Sync from server on load
  useEffect(() => {
    if (reflection) {
      setLocalAnswers(reflection.answers ?? {});
      setLocalStamps(reflection.stamps ?? {});
      setDirty(false);
    }
  }, [reflection]);

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

      {/* Tabs */}
      <div className="inline-flex gap-0.5 p-[3px] rounded-[30px] bg-surface-2 mb-[22px]">
        <button
          className={cn(
            "font-ui text-[13px] font-medium px-5 py-2 rounded-[30px] transition-all",
            tab === "reflection" ? "text-ink bg-surface" : "text-ink-soft"
          )}
          onClick={() => setTab("reflection")}
        >
          Reflection
        </button>
        <button
          className={cn(
            "font-ui text-[13px] font-medium px-5 py-2 rounded-[30px] transition-all",
            tab === "digest" ? "text-ink bg-surface" : "text-ink-soft"
          )}
          onClick={() => setTab("digest")}
        >
          Week in review
        </button>
      </div>

      {tab === "reflection" ? (
        <WeeklyReflectionView
          prompts={WEEKLY_PROMPTS}
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
  prompts,
  localAnswers,
  localStamps,
  serverAnswers,
  dirty,
  isPending,
  onAnswerChange,
  onStampToggle,
  onSave,
}: {
  prompts: Array<{ key: string; q: string; hint?: string }>;
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
  const hasSavedData = Object.values(serverAnswers).some(v => v && v.trim().length > 0);

  // If saved and not dirty, show read-only view
  const showSavedView = hasSavedData && !dirty && !editing;

  if (showSavedView) {
    return (
      <div className="pb-20">
        {prompts.map((prompt) => {
          const answer = serverAnswers[prompt.key];
          if (!answer) return null;
          return (
            <div key={prompt.key} className="rounded-16 p-5 mb-3.5 bg-surface">
              <div className="flex gap-3 items-start">
                <span className="font-ui text-[13px] font-semibold leading-[1.9] text-ink-soft/70 shrink-0 min-w-[22px] tabular">
                  {prompt.key}
                </span>
                <div className="flex-1">
                  <p className="font-serif text-base font-medium leading-[1.4] text-ink-soft">
                    {prompt.q}
                  </p>
                  <p className="font-serif text-base leading-[1.7] text-ink mt-2">
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
          <PencilSimple size={22} weight="thin" />
        </button>
      </div>
    );
  }

  return (
    <Busy busy={isPending} className="pb-20">
      {prompts.map((prompt) => (
        <PromptCard
          key={prompt.key}
          number={prompt.key}
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
          {isPending ? <ButtonLoader /> : <FloppyDisk size={22} weight="thin" />}
        </button>
      )}
    </Busy>
  );
}

