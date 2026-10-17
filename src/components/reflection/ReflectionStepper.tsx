"use client";

import { useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Chevron } from "@/components/ui/Arrows";
import { cn } from "@/lib/utils";
import { StampRow } from "./StampRow";
import { MoodPicker } from "./MoodPicker";

export interface Prompt {
  key: string;
  q: string;
  hint?: string;
}

interface Props {
  prompts: Prompt[];
  answers: Record<string, string>;
  stamps: Record<string, string[]>;
  mood: string | null;
  /** Step to open on (a question index, or prompts.length for the mood). */
  startAt: number;
  saving: boolean;
  onAnswer: (key: string, value: string) => void;
  onStamp: (key: string, stamp: string) => void;
  onMood: (mood: string | null) => void;
  /** Called on every step change, so answers are kept as you go. */
  onStep: () => void;
  onDone: () => void;
}

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Daily reflection, one question at a time: a step indicator, the question, room to write,
 * the stamps, then Back / Next (Skip while a question is still empty). The mood is the last
 * step, where Next becomes Save. Swiping sideways moves between questions on phones.
 */
export function ReflectionStepper({ prompts, answers, stamps, mood, startAt, saving, onAnswer, onStamp, onMood, onStep, onDone }: Props) {
  const reduce = useReducedMotion();
  const total = prompts.length + 1; // + mood
  const [step, setStep] = useState(Math.min(Math.max(0, startAt), total - 1));
  const [dir, setDir] = useState(1);
  const touch = useRef<{ x: number; y: number } | null>(null);

  const isMood = step === prompts.length;
  const prompt = prompts[step];
  const last = step === total - 1;
  // Words or a stamp both count as an answer.
  const answered = (i: number) => (i < prompts.length ? !!answers[prompts[i].key]?.trim() || (stamps[prompts[i].key]?.length ?? 0) > 0 : !!mood);

  function go(to: number) {
    if (to < 0 || to >= total || to === step) return;
    setDir(to > step ? 1 : -1);
    setStep(to);
    onStep();
  }

  return (
    <div
      className="flex flex-col"
      onTouchStart={(e) => (touch.current = { x: e.touches[0].clientX, y: e.touches[0].clientY })}
      onTouchEnd={(e) => {
        const start = touch.current;
        touch.current = null;
        if (!start || (e.target as Element).closest("input[type=range], [role=slider]")) return;
        const dx = e.changedTouches[0].clientX - start.x;
        const dy = e.changedTouches[0].clientY - start.y;
        if (Math.abs(dx) > 60 && Math.abs(dx) > Math.abs(dy) * 1.5) go(step + (dx < 0 ? 1 : -1));
      }}
    >
      {/* Where you are: the count, and a full-width bar of one segment per step (the current one
          in full colour, answered ones lighter). Each segment opens its question. */}
      <div className="mb-5">
        <span className="block mb-2 font-ui text-[13px] font-semibold text-ink-soft tabular">
          {isMood ? "Last one" : `${step + 1} of ${prompts.length}`}
        </span>
        <div className="flex items-center gap-1.5" role="tablist" aria-label="Questions">
          {Array.from({ length: total }).map((_, i) => (
            <button
              key={i}
              type="button"
              role="tab"
              aria-selected={i === step}
              aria-label={i < prompts.length ? `Question ${i + 1}${answered(i) ? ", answered" : ""}` : "Mood"}
              onClick={() => go(i)}
              className="press flex-1 flex items-center h-6"
            >
              <span
                className={cn(
                  "block w-full h-1.5 rounded-full transition-colors duration-300",
                  i === step ? "bg-accent" : answered(i) ? "bg-accent/45" : "bg-line"
                )}
              />
            </button>
          ))}
        </div>
      </div>

      <div className="relative min-h-[300px]">
        <AnimatePresence mode="wait" initial={false} custom={dir}>
          <motion.section
            key={step}
            custom={dir}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 28 }}
            animate={{ opacity: 1, x: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -28 }}
            transition={{ duration: 0.24, ease: EASE }}
            className="rounded-[22px] bg-surface p-5 sm:p-7"
          >
            {isMood ? (
              <MoodPicker bare value={mood} onChange={onMood} />
            ) : (
              <>
                <h2 className="font-display text-[22px] sm:text-[24px] font-semibold leading-[1.3] text-ink text-balance">{prompt.q}</h2>
                {prompt.hint && <p className="mt-2.5 font-ui text-[13.5px] leading-[1.55] text-ink-soft">{prompt.hint}</p>}
                <textarea
                  value={answers[prompt.key] ?? ""}
                  onChange={(e) => onAnswer(prompt.key, e.target.value)}
                  placeholder="Reflect…"
                  aria-label={prompt.q}
                  rows={5}
                  className="mt-5 w-full resize-none rounded-[14px] bg-surface-2 px-4 py-3 font-serif text-[17px] leading-[1.7] text-ink outline-none border border-transparent focus:border-accent placeholder:italic placeholder:text-ink-soft/60"
                />
                <StampRow selected={stamps[prompt.key] ?? []} onToggle={(s) => onStamp(prompt.key, s)} />
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="mt-5 flex items-center gap-2">
        <Button variant="secondary" onClick={() => go(step - 1)} disabled={step === 0 || saving} aria-label="Previous question">
          <Chevron dir="left" size={16} />
        </Button>
        <span className="flex-1" />
        {last ? (
          <Button onClick={onDone} loading={saving}>Save</Button>
        ) : answered(step) ? (
          <Button onClick={() => go(step + 1)} disabled={saving}>
            Next <Chevron dir="right" size={16} />
          </Button>
        ) : (
          <Button variant="secondary" onClick={() => go(step + 1)} disabled={saving}>
            Skip <Chevron dir="right" size={16} />
          </Button>
        )}
      </div>
    </div>
  );
}
