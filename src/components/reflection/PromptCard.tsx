"use client";

import { StampRow } from "./StampRow";

interface PromptCardProps {
  number: string;
  question: string;
  hint?: string;
  answer: string;
  stamps: string[];
  onAnswerChange: (val: string) => void;
  onStampToggle: (stamp: string) => void;
  /** Put the cursor here (at the end of the answer) when the card opens: the question that was tapped. */
  focus?: boolean;
}

/** The box fits its text: on opening (a long saved answer shows whole) and as it's typed. */
function fit(el: HTMLTextAreaElement) {
  el.style.height = "auto";
  el.style.height = Math.max(el.scrollHeight, 56) + "px";
}

export function PromptCard({

  question,
  hint,
  answer,
  stamps,
  onAnswerChange,
  onStampToggle,
  focus = false,
}: PromptCardProps) {
  return (
    <div className="rounded-[22px] p-5 sm:p-6 mb-3.5 bg-surface border border-line/70">
      <p className="font-display text-[19px] sm:text-[21px] font-semibold leading-[1.3] text-ink text-balance">{question}</p>
      {hint && <p className="mt-1.5 font-serif italic text-[14.5px] text-ink-soft leading-[1.55]">{hint}</p>}
      <textarea
        className="mt-3 w-full bg-transparent resize-none px-0.5 font-serif text-[16.5px] leading-[28px] text-ink outline-none min-h-[56px] placeholder:italic placeholder:text-ink-soft/55"
        style={{
          backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 27px, var(--line) 27px, var(--line) 28px)",
          backgroundAttachment: "local",
          backgroundPosition: "0 0",
        }}
        placeholder="Write as it comes…"
        value={answer}
        onChange={(e) => onAnswerChange(e.target.value)}
        rows={2}
        aria-label={question}
        ref={(el) => {
          if (!el) return;
          fit(el);
          if (focus && !el.dataset.focused) {
            el.dataset.focused = "1";
            el.focus({ preventScroll: true });
            el.setSelectionRange(el.value.length, el.value.length);
            requestAnimationFrame(() => el.scrollIntoView({ block: "center", behavior: "smooth" }));
          }
        }}
        onInput={(e) => fit(e.currentTarget)}
      />
      <div className="mt-3 pt-3 border-t border-line/70">
        <StampRow selected={stamps} onToggle={onStampToggle} />
      </div>
    </div>
  );
}
