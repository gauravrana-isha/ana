"use client";

import { createElement } from "react";
import Image from "next/image";
import * as Icons from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";
import { catalogFor, catalogImage } from "@/lib/practiceCatalog";
import { cn } from "@/lib/utils";

// Older practices saved icon names that aren't Phosphor exports.
const ALIASES: Record<string, string> = { Pyramid: "Triangle", Bowl: "BowlFood" };

function iconFor(name: string): React.ComponentType<IconProps> {
  const found = (Icons as unknown as Record<string, React.ComponentType<IconProps> | undefined>)[ALIASES[name] ?? name];
  return found && typeof found === "object" ? found : Icons.Leaf;
}

const TONES: [string, string][] = [
  ["#8fae8a", "#5b7a58"],
  ["#e0a878", "#b8704a"],
  ["#88a9c0", "#4f7288"],
  ["#c98f86", "#94574f"],
  ["#b9a36e", "#86713f"],
  ["#9d8fb8", "#67598a"],
];

function toneIndex(name: string) {
  let h = 0;
  for (const ch of name) h = (h * 31 + ch.charCodeAt(0)) | 0;
  return Math.abs(h) % TONES.length;
}

/** The practice's illustration when we have one, otherwise its icon on a soft tile. */
export function PracticeIcon({
  name,
  iconName,
  catalogId,
  size = 36,
  className,
}: {
  name: string;
  iconName: string;
  catalogId?: string | null;
  size?: number;
  className?: string;
}) {
  const entry = catalogFor({ catalogId, name });
  const img = catalogImage(entry);
  const icon = entry && !entry.image ? entry.icon : iconName;
  if (img) {
    return (
      <Image
        src={img}
        alt=""
        width={size}
        height={size}
        unoptimized={img.endsWith(".svg")}
        className={cn("rounded-[10px] shrink-0 bg-surface-2", className)}
        style={{ width: size, height: size }}
      />
    );
  }
  // Custom practices: a painted tile, toned by the chosen icon.
  return <PaintedTile icon={icon} size={size} className={className} />;
}

/** A warm painted tile with a cream icon, in the spirit of the practice illustrations. */
export function PaintedTile({ icon, size = 36, className }: { icon: string; size?: number; className?: string }) {
  const [from, to] = TONES[toneIndex(icon)];
  return (
    <span
      className={cn("rounded-[10px] grid place-items-center shrink-0 text-[#fdf6e7] shadow-[inset_0_-8px_16px_rgba(0,0,0,0.12)]", className)}
      style={{ width: size, height: size, background: `radial-gradient(120% 100% at 50% 30%, ${from}, ${to})` }}
    >
      {createElement(iconFor(icon), { size: Math.round(size * 0.52), weight: "duotone" })}
    </span>
  );
}
