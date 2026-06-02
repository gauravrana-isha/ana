"use client";

import { MicButton } from "./MicButton";
import { StampRow } from "./StampRow";

interface PromptCardProps {
  number: string;
  question: string;
  hint?: string;
  answer: string;
  stamps: string[];
  onAnswerChange: (val: string) => void;
  onStampToggle: (stamp: string) => void;
}

export function PromptCard({
  number,
  question,
  hint,
  answer,
  stamps,
  onAnswerChange,
  onStampToggle,
}: PromptCardProps) {
  function handleTranscript(text: string) {
    onAnswerChange(answer + text);
  }

  return (
    <div className="rounded-16 p-5 mb-3.5 bg-surface">
      <div className="flex gap-3 items-start">
        <span className="font-hand text-2xl leading-none text-accent shrink-0 min-w-[22px]">
          {number}
        </span>
        <p className="font-serif text-lg font-medium leading-[1.4] text-ink">
          {question}
        </p>
      </div>
      {hint && (
        <p className="font-ui text-[13px] text-ink-soft leading-[1.55] mt-2.5 ml-[34px]">
          {hint}
        </p>
      )}
      <div className="flex gap-2 mt-3.5 ml-[34px]">
        <textarea
          className="flex-1 font-serif text-base w-full border-none resize-none text-ink leading-[1.7] outline-none min-h-[38px] bg-surface-2 rounded-[10px] p-[11px_13px] placeholder:text-ink-soft placeholder:opacity-70 placeholder:italic"
          placeholder="Reflect…"
          value={answer}
          onChange={(e) => onAnswerChange(e.target.value)}
          rows={1}
          onInput={(e) => {
            const target = e.target as HTMLTextAreaElement;
            target.style.height = "auto";
            target.style.height = target.scrollHeight + "px";
          }}
        />
        <MicButton onTranscript={handleTranscript} />
      </div>
      <div className="ml-[34px]">
        <StampRow selected={stamps} onToggle={onStampToggle} />
      </div>
    </div>
  );
}
