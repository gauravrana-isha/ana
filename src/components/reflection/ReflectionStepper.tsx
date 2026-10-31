"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { Button } from "@/components/ui/Button";
import { Chevron } from "@/components/ui/Arrows";
import { cn } from "@/lib/utils";
import { StampRow } from "./StampRow";
import { MoodPicker } from "./MoodPicker";
import { QuestionPicture } from "./QuestionPicture";
import type { QuestionPicture as Picture } from "@/lib/questions";

export interface Prompt {
  key: string;
  q: string;
  hint?: string;
  /** A photo above the question (some built-ins have one). */
  picture?: Picture;
}

interface Props {
  prompts: Prompt[];
  answers: Record<string, string>;
  stamps: Record<string, string[]>;
  /** The day's mood, asked on a last card (Daily). Leave out for no mood card (Weekly). */
  mood?: string | null;
  /** Step to open on (a question index, or prompts.length for the mood). */
  startAt: number;
  saving: boolean;
  onAnswer: (key: string, value: string) => void;
  onStamp: (key: string, stamp: string) => void;
  onMood?: (mood: string | null) => void;
  /** Called on every step change, so answers are kept as you go. */
  onStep: () => void;
  onDone: () => void;
}

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
/** How far a card is dragged before it moves on (or flicked fast enough). */
const SWIPE = 90;

/**
 * Daily reflection, one question at a time, as a small deck of cards: the question on top,
 * the next ones peeking behind it. Drag the card sideways (or tap Next / Skip / Back, or a
 * segment of the bar) to move through them; the mood is the last card, where Next becomes
 * Save. Swipes on the card move between questions; swipes elsewhere on the page move between
 * the bundle's screens.
 */
export function ReflectionStepper({ prompts, answers, stamps, mood, startAt, saving, onAnswer, onStamp, onMood, onStep, onDone }: Props) {
  const reduce = useReducedMotion();
  const withMood = mood !== undefined;
  const total = prompts.length + (withMood ? 1 : 0);
  const [step, setStep] = useState(Math.min(Math.max(0, startAt), total - 1));
  const [dir, setDir] = useState(1);
  const drag = useDragControls();

  const isMood = step === prompts.length;
  const prompt = prompts[step];
  const last = step === total - 1;
  // Words or a stamp both count as an answer.
  const answered = (i: number) => (i < prompts.length ? !!answers[prompts[i].key]?.trim() || (stamps[prompts[i].key]?.length ?? 0) > 0 : !!mood);
  const left = total - 1 - step;

  function go(to: number) {
    if (to < 0 || to >= total || to === step) return;
    // The writing box lets go as its card leaves: the keyboard closes once and the tab bar settles.
    // (Moving the cursor into the next card instead made phones drop and re-show the keyboard,
    // and the tab bar flashed in and out with it.)
    if (document.activeElement instanceof HTMLElement && document.activeElement.tagName === "TEXTAREA") document.activeElement.blur();
    setDir(to > step ? 1 : -1);
    setStep(to);
    onStep();
  }

  const endDrag = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > SWIPE || Math.abs(info.velocity.x) > 500;
    if (far) go(step + (info.offset.x < 0 ? 1 : -1));
  };

  // Drag from anywhere on the card, the writing box too (a tap there still places the cursor;
  // only a sideways move drags), but not from a stamp, a button or the mood slider.
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || (e.target as Element).closest("button, input, [role=slider], [role=radiogroup]")) return;
    drag.start(e);
  };

  return (
    // The card's own swipes are its own: the page's swipe between screens leaves them alone.
    <div className="flex flex-col" data-no-swipe>
      {/* Where you are: one segment per card (the current one full, answered ones lighter). */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1.5" role="tablist" aria-label="Questions">
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
              <span className={cn("block w-full h-1.5 rounded-full transition-colors duration-300", i === step ? "bg-accent" : answered(i) ? "bg-accent/45" : "bg-line")} />
            </button>
          ))}
        </div>
        <span className="shrink-0 font-ui text-[12.5px] font-semibold text-ink-soft tabular">{isMood ? "Last" : `${step + 1} / ${prompts.length}`}</span>
      </div>

      {/* The deck: the card on top, and up to two behind it (as many as are left). */}
      <div className="relative grid">
        {[2, 1].map(
          (n) =>
            left >= n && (
              <div
                key={n}
                aria-hidden="true"
                className="col-start-1 row-start-1 rounded-[24px] bg-surface-2 border border-line transition-all duration-300"
                style={{ transform: `translateY(${n * 13}px) scale(${1 - n * 0.045})`, opacity: n === 1 ? 0.9 : 0.6 }}
              />
            )
        )}
        <AnimatePresence initial={false} custom={dir} mode="popLayout">
          <motion.section
            key={step}
            custom={dir}
            aria-roledescription="card"
            aria-label={isMood ? "How was the day?" : `Question ${step + 1} of ${prompts.length}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, x: dir * 60, rotate: dir * 1.5 }}
            animate={{ opacity: 1, x: 0, rotate: 0 }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, x: dir * -80, rotate: dir * -2, transition: { duration: 0.2 } }}
            transition={SPRING}
            drag={reduce ? false : "x"}
            dragControls={drag}
            dragListener={false}
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.55}
            dragDirectionLock
            onDragEnd={endDrag}
            onPointerDown={startDrag}
            style={{ touchAction: "pan-y" }}
            className="col-start-1 row-start-1 relative rounded-[24px] bg-surface border border-line/70 shadow-[var(--shadow-soft)] p-5 pb-4 sm:p-7 sm:pb-5 min-h-[360px] flex flex-col"
          >
            {isMood ? (
              <>
                <div className="flex-1">
                  <MoodPicker bare value={mood ?? null} onChange={(m) => onMood?.(m)} />
                </div>
              </>
            ) : (
              <>
                {prompt.picture && <QuestionPicture picture={prompt.picture} className="-mx-3 -mt-3 sm:-mx-5 sm:-mt-5 mb-4" />}
                <h2 className="font-display text-[23px] sm:text-[26px] font-semibold leading-[1.28] tracking-[-0.01em] text-ink text-balance">{prompt.q}</h2>
                {prompt.hint && <p className="mt-2 font-serif italic text-[15px] leading-[1.55] text-ink-soft">{prompt.hint}</p>}
                <Lined
                  value={answers[prompt.key] ?? ""}
                  onChange={(v) => onAnswer(prompt.key, v)}
                  label={prompt.q}
                />
                <div className="mt-3 pt-3 border-t border-line/70">
                  <StampRow selected={stamps[prompt.key] ?? []} onToggle={(s) => onStamp(prompt.key, s)} />
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      <div className="mt-9 flex items-center gap-2">
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

/**
 * Room to write, on faint ruled lines like a journal page; it grows with what's written.
 */
function Lined({ value, onChange, label }: { value: string; onChange: (v: string) => void; label: string }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 5 * 28) + "px";
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    fit(el);
  }, []);
  return (
    <textarea
      ref={ref}
      value={value}
      onChange={(e) => {
        onChange(e.target.value);
        fit(e.target);
      }}
      placeholder="Write as it comes…"
      aria-label={label}
      rows={5}
      // It grows to fit, so it never scrolls inside itself: on a phone a box that can scroll keeps
      // a sideways swipe for itself, and the card wouldn't move. Sideways is the card's; up and
      // down is the page's.
      className="mt-4 flex-1 w-full resize-none overflow-hidden bg-transparent px-0.5 font-serif text-[17px] leading-[28px] text-ink outline-none placeholder:italic placeholder:text-ink-soft/55"
      style={{
        touchAction: "pan-y",
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, var(--line) 27px, var(--line) 28px)",
        backgroundAttachment: "local",
        backgroundPosition: "0 0",
      }}
    />
  );
}
