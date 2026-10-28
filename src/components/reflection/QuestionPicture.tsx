import type { QuestionPicture as Picture } from "@/lib/questions";
import { cn } from "@/lib/utils";

/** A quiet photo above a question, in gentle colour, with its credit when the licence asks. */
export function QuestionPicture({ picture, className }: { picture: Picture; className?: string }) {
  return (
    <figure className={cn("relative overflow-hidden rounded-[14px] bg-surface-2", className)}>
      {/* eslint-disable-next-line @next/next/no-img-element -- small fixed photos, kept offline by the service worker */}
      <img
        src={picture.src}
        alt={picture.alt}
        draggable={false}
        className="ana-question-picture block w-full h-[128px] sm:h-[180px] object-cover"
        style={{ objectPosition: picture.focus ?? "center" }}
      />
      {picture.credit && (
        <figcaption className="absolute right-1.5 bottom-1 font-sans text-[10px] leading-4 text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,.6)]">
          <a href={picture.credit.href} target="_blank" rel="noreferrer" className="hover:underline">
            {picture.credit.by}, {picture.credit.licence}
          </a>
        </figcaption>
      )}
    </figure>
  );
}
