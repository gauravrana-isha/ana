"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
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

const SPRING = { type: "spring", stiffness: 380, damping: 34 } as const;
/** How far a card is dragged before it moves on (or flicked fast enough). */
const SWIPE = 90;

/**
 * Daily reflection, one question at a time, as a small deck of cards: the question on top,
 * the next ones peeking behind it. Drag the card sideways (or tap Next / Skip / Back, or a
 * segment of the bar) to move through them; the mood is the last card, where Next becomes
 * Save. Swipes on the card move between questions; swipes elsewhere on the page move between
 * the bundle's screens. Writing keeps the keyboard up from one card to the next.
 */
export function ReflectionStepper({ prompts, answers, stamps, mood, startAt, saving, onAnswer, onStamp, onMood, onStep, onDone }: Props) {
  const reduce = useReducedMotion();
  const total = prompts.length + 1; // + mood
  const [step, setStep] = useState(Math.min(Math.max(0, startAt), total - 1));
  const [dir, setDir] = useState(1);
  const drag = useDragControls();
  // Writing when the card changed: the next card's box takes the cursor, so the keyboard stays
  // up (and the tab bar doesn't slide back in for a moment between cards).
  const [keepTyping, setKeepTyping] = useState(false);

  const isMood = step === prompts.length;
  const prompt = prompts[step];
  const last = step === total - 1;
  // Words or a stamp both count as an answer.
  const answered = (i: number) => (i < prompts.length ? !!answers[prompts[i].key]?.trim() || (stamps[prompts[i].key]?.length ?? 0) > 0 : !!mood);
  const left = total - 1 - step;

  function go(to: number) {
    if (to < 0 || to >= total || to === step) return;
    setKeepTyping(document.activeElement?.tagName === "TEXTAREA");
    setDir(to > step ? 1 : -1);
    setStep(to);
    onStep();
  }

  const endDrag = (_: unknown, info: PanInfo) => {
    const far = Math.abs(info.offset.x) > SWIPE || Math.abs(info.velocity.x) > 500;
    if (far) go(step + (info.offset.x < 0 ? 1 : -1));
  };

  // Drag only from the card itself, not from the writing box, a stamp or a button.
  const startDrag = (e: React.PointerEvent) => {
    if (e.pointerType === "mouse" || (e.target as Element).closest("textarea, button, input, [role=slider]")) return;
    drag.start(e);
  };

  return (
    // The card's own swipes are its own: the page's swipe between screens leaves them alone.
    <div className="flex flex-col" data-no-swipe>
      {/* Where you are: one segment per card (the current one full, answered ones lighter). */}
      <div className="mb-4 flex items-center gap-3">
        <div className="flex-1 flex items-center gap-1.5" role="tablist" aria-label="Questions" onMouseDown={(e) => e.preventDefault()}>
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
            onDragEnd={endDrag}
            onPointerDown={startDrag}
            style={{ touchAction: "pan-y" }}
            className="col-start-1 row-start-1 relative rounded-[24px] bg-surface border border-line/70 shadow-[var(--shadow-soft)] p-5 pb-4 sm:p-7 sm:pb-5 min-h-[360px] flex flex-col"
          >
            {isMood ? (
              <>
                <CardEyebrow>The day, in one feeling</CardEyebrow>
                <div className="mt-3 flex-1">
                  <MoodPicker bare value={mood} onChange={onMood} />
                </div>
              </>
            ) : (
              <>
                <CardEyebrow>Question {step + 1}</CardEyebrow>
                <h2 className="mt-2 font-display text-[23px] sm:text-[26px] font-semibold leading-[1.28] tracking-[-0.01em] text-ink text-balance">{prompt.q}</h2>
                {prompt.hint && <p className="mt-2 font-serif italic text-[15px] leading-[1.55] text-ink-soft">{prompt.hint}</p>}
                <Lined
                  value={answers[prompt.key] ?? ""}
                  onChange={(v) => onAnswer(prompt.key, v)}
                  label={prompt.q}
                  focus={keepTyping}
                />
                <div className="mt-3 pt-3 border-t border-line/70">
                  <StampRow selected={stamps[prompt.key] ?? []} onToggle={(s) => onStamp(prompt.key, s)} />
                </div>
              </>
            )}
          </motion.section>
        </AnimatePresence>
      </div>

      {/* Pressing Back / Next doesn't take the cursor out of the writing box (that would drop
          the keyboard between cards). */}
      <div className="mt-9 flex items-center gap-2" onMouseDown={(e) => e.preventDefault()}>
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

/** The small line above a card's question, with an ink mark before it. */
function CardEyebrow({ children }: { children: React.ReactNode }) {
  return (
    <span className="inline-flex items-center gap-2 font-ui text-[12px] font-semibold uppercase tracking-[0.09em] text-accent">
      <span aria-hidden="true" className="w-4 h-[2px] rounded-full bg-accent/70" />
      {children}
    </span>
  );
}

/**
 * Room to write, on faint ruled lines like a journal page; it grows with what's written.
 * `focus`: take the cursor on arrival (writing carried on from the card before).
 */
function Lined({ value, onChange, label, focus }: { value: string; onChange: (v: string) => void; label: string; focus: boolean }) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const fit = (el: HTMLTextAreaElement) => {
    el.style.height = "auto";
    el.style.height = Math.max(el.scrollHeight, 5 * 28) + "px";
  };
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    fit(el);
    if (focus) {
      el.focus({ preventScroll: true });
      el.setSelectionRange(el.value.length, el.value.length);
    }
    // Only on arrival.
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
      className="mt-4 flex-1 w-full resize-none bg-transparent px-0.5 font-serif text-[17px] leading-[28px] text-ink outline-none placeholder:italic placeholder:text-ink-soft/55"
      style={{
        backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, var(--line) 27px, var(--line) 28px)",
        backgroundAttachment: "local",
        backgroundPosition: "0 0",
      }}
    />
  );
}
