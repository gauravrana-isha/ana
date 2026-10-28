import type { QuestionPicture as Picture } from "@/lib/questions";
import { cn } from "@/lib/utils";

/** A quiet photo above a question, in gentle colour (its credit is on /credits). */
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
    </figure>
  );
}
