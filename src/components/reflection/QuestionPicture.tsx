"use client";

import type { QuestionPicture as Picture } from "@/lib/questions";
import { useMediaSrc } from "@/lib/vault/files";
import { cn } from "@/lib/utils";

/**
 * A quiet photo above a question, always 3 wide to 1 high (so what's chosen is what shows).
 * The built-in ones are in gentle colour (their credits are on /credits); someone's own photo
 * is stored encrypted, opened here, and shown as it is.
 */
export function QuestionPicture({ picture, className }: { picture: Picture; className?: string }) {
  const stored = picture.own ? picture.src.slice("/api/media/".length) : null;
  const opened = useMediaSrc(stored);
  const src = stored ? opened : picture.src;
  return (
    <figure className={cn("relative overflow-hidden rounded-[14px] bg-surface-2 aspect-[3/1]", className)}>
      {src && (
        // eslint-disable-next-line @next/next/no-img-element -- small fixed photos, kept offline
        <img
          src={src}
          alt={picture.alt}
          draggable={false}
          className={cn("block w-full h-full object-cover", !picture.own && "ana-question-picture")}
          style={{ objectPosition: picture.focus ?? "center" }}
        />
      )}
    </figure>
  );
}
