"use client";

import { useState } from "react";
import { TickMark } from "@/components/tracker/FieldInput";
import { phraseWords } from "@/lib/vault/vault";
import { Glyph } from "@/components/art/Glyphs";

/** The 12 recovery words, numbered, in reading order; with a way to copy them. */
export function RecoveryWords({ phrase }: { phrase: string }) {
  const words = phraseWords(phrase);
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-[20px] bg-surface p-4 sm:p-5">
      <ol className="grid grid-cols-2 sm:grid-cols-3 gap-x-3 gap-y-2" aria-label="Recovery words">
        {words.map((w, i) => (
          <li key={i} className="flex items-baseline gap-2 h-10 px-3 rounded-[12px] bg-bg">
            <span className="font-ui text-[12px] text-ink-soft tabular w-5 text-right shrink-0 self-center">{i + 1}</span>
            <span className="font-ui text-[16px] font-semibold text-ink self-center tracking-[0.01em]">{w}</span>
          </li>
        ))}
      </ol>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(words.join(" "));
            setCopied(true);
            setTimeout(() => setCopied(false), 2200);
          } catch {
            /* clipboard blocked: they can still write them down */
          }
        }}
        className="press mt-3 inline-flex items-center gap-1.5 h-9 px-3 rounded-[11px] font-ui text-[13px] font-semibold text-accent hover:bg-accent-soft"
      >
        {copied ? <TickMark size={15} /> : <Glyph k="copy" size={17} />} {copied ? "Copied" : "Copy the words"}
      </button>
    </div>
  );
}
