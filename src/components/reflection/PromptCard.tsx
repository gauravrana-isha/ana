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
  el.style.height = el.scrollHeight + "px";
}

export function PromptCard({
  number,
  question,
  hint,
  answer,
  stamps,
  onAnswerChange,
  onStampToggle,
  focus = false,
}: PromptCardProps) {
  return (
    <div className="rounded-16 p-4 sm:p-5 mb-3.5 bg-surface">
      <div className="flex gap-3 items-start">
        <span className="font-ui text-[13px] font-semibold leading-[1.9] text-ink-soft/70 shrink-0 min-w-[22px] tabular">
          {number}
        </span>
        <p className="font-serif text-lg font-medium leading-[1.4] text-ink">
          {question}
        </p>
      </div>
      {hint && (
        <p className="font-ui text-[13px] text-ink-soft leading-[1.55] mt-2.5 sm:ml-[34px]">
          {hint}
        </p>
      )}
      <div className="flex gap-2 mt-3.5 sm:ml-[34px]">
        <textarea
          className="flex-1 font-serif text-base w-full border-none resize-none text-ink leading-[1.7] outline-none min-h-[38px] bg-surface-2 rounded-[10px] p-[11px_13px] placeholder:text-ink-soft placeholder:opacity-70 placeholder:italic"
          placeholder="Reflect…"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={1}
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
      </div>
      <div className="sm:ml-[34px]">
        <StampRow selected={stamps} onToggle={onStampToggle} />
      </div>
    </div>
  );
}
