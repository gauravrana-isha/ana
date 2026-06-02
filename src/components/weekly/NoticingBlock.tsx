"use client";

interface NoticingBlockProps {
  html: string | null;
}

export function NoticingBlock({ html }: NoticingBlockProps) {
  if (!html) return null;

  return (
    <div
      className="font-serif italic text-base leading-[1.65] text-ink bg-accent-soft rounded-14 p-[18px_20px] mt-2
                 [&_b]:not-italic [&_b]:text-accent [&_b]:font-semibold"
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
