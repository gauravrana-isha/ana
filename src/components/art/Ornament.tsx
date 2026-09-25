import { cn } from "@/lib/utils";

/** Line ornaments from the Isha design library, drawn in the current text colour. */
const ORNAMENTS = {
  divider: { src: "/decor/divider.svg", ratio: 300 / 30 },
  flourish: { src: "/decor/flourish.svg", ratio: 313 / 30 },
  leaves: { src: "/decor/leaves.svg", ratio: 685 / 233 },
  kolam: { src: "/decor/kolam.png", ratio: 319 / 60 },
  vine: { src: "/decor/vine.png", ratio: 197 / 23 },
} as const;

export type OrnamentName = keyof typeof ORNAMENTS;

export function Ornament({ name, width, className }: { name: OrnamentName; width: number; className?: string }) {
  const o = ORNAMENTS[name];
  const mask = `url("${o.src}") center / contain no-repeat`;
  return (
    <span
      aria-hidden="true"
      className={cn("block shrink-0 bg-current", className)}
      style={{ width, height: Math.round(width / o.ratio), mask, WebkitMask: mask }}
    />
  );
}
