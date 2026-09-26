"use client";

import { useId, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { RINGS, toneStyle, weightOf, type PortraitDTO, type RingKey } from "@/lib/portrait";
import { cn } from "@/lib/utils";

type Portrait = Pick<PortraitDTO, "body" | "mind" | "emotion"> & { weights?: PortraitDTO["weights"] };

/*
 * "Who am I?" as still water. Three layers, top to bottom: emotion in the dawn light above
 * the surface, mind in the water, body in the earth below. Each word finds its own place in
 * its layer: the lighter it is, the higher it floats (lightest words let go of a bubble now
 * and then); the heavier, the lower it rests. Every word has its own colour on a scale from
 * deep indigo (heaviest) to gold (lightest).
 *
 * Drawn on a 400×300 grid and scaled to the width it's given.
 */
const W = 400;
const H = 300;
const BAND = { emotion: 0, mind: 100, body: 200 } as const;
const ORDER: RingKey[] = ["emotion", "mind", "body"];
const HUE = { emotion: "#cf6f8e", mind: "#4f7fae", body: "#9c7148" } as const;
const EASE = [0.16, 1, 0.3, 1] as const;

interface Placed {
  word: string;
  weight: number;
  x: number;
  y: number;
  w: number;
  i: number;
}

/** A small deterministic random from a string, so a word keeps its place between visits. */
function seeded(key: string) {
  let h = 2166136261;
  for (let i = 0; i < key.length; i++) h = Math.imul(h ^ key.charCodeAt(i), 16777619);
  return () => {
    h = Math.imul(h ^ (h >>> 15), 2246822507);
    h = Math.imul(h ^ (h >>> 13), 3266489909);
    return ((h ^= h >>> 16) >>> 0) / 4294967296;
  };
}

/**
 * Scatter a layer's words: height from weight (lighter higher), across the width at random,
 * never on top of each other or of the layer's name in the bottom-right corner.
 */
function place(words: string[], k: RingKey, compact: boolean, custom?: Record<string, number>): Placed[] {
  const top = BAND[k];
  const out: Placed[] = [];
  const boxes: { x0: number; x1: number; y0: number; y1: number }[] = [{ x0: 300, x1: W, y0: top + 78, y1: top + 100 }];
  words.forEach((word, i) => {
    const weight = weightOf(word, custom);
    const w = compact ? 20 : word.length * 8.4 + 20;
    const baseY = top + 30 + ((1 - weight) / 2) * 50; // lightest near the top of the layer, heaviest near the bottom
    const rnd = seeded(`${k}:${word}`);
    let best: Placed | null = null;
    for (let attempt = 0; attempt < 40; attempt++) {
      const x = 14 + rnd() * Math.max(1, W - 28 - w);
      const y = Math.min(top + 86, Math.max(top + 27, baseY + (rnd() - 0.5) * 14 + (attempt > 20 ? (rnd() - 0.5) * 18 : 0)));
      const box = { x0: x - 4, x1: x + w + 4, y0: y - 16, y1: y + 6 };
      const clear = boxes.every((b) => box.x1 < b.x0 || box.x0 > b.x1 || box.y1 < b.y0 || box.y0 > b.y1);
      best = { word, weight, x, y, w, i };
      if (clear) break;
    }
    boxes.push({ x0: best!.x - 4, x1: best!.x + w + 4, y0: best!.y - 16, y1: best!.y + 6 });
    out.push(best!);
  });
  return out;
}

export function PortraitPond({
  portrait,
  maxWidth = 440,
  compact = false,
  interactive = true,
  className,
}: {
  portrait: Portrait | null;
  maxWidth?: number;
  /** Dots instead of words, for thumbnails. */
  compact?: boolean;
  interactive?: boolean;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const reduce = useReducedMotion();
  const alive = !reduce && !compact;
  const [focus, setFocus] = useState<RingKey | null>(null);
  const focused = RINGS.find((r) => r.key === focus);
  const tint = (hex: string, pct: number) => `color-mix(in srgb, ${hex} ${pct}%, var(--surface))`;
  const fade = (k: RingKey) => ({ opacity: focus && focus !== k ? 0.5 : 1, transition: "opacity .4s" });

  return (
    <figure className={cn("w-full flex flex-col items-center select-none", className)} style={{ maxWidth }}>
      <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={describe(portrait)} className="w-full h-auto rounded-[18px] overflow-hidden block ring-1 ring-[color-mix(in_srgb,var(--ink)_8%,transparent)]">
        <defs>
          <linearGradient id={`${uid}-air`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint(HUE.emotion, 20)} />
            <stop offset="1" stopColor={tint("#e59a8c", 26)} />
          </linearGradient>
          <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint(HUE.mind, 22)} />
            <stop offset="1" stopColor={tint(HUE.mind, 40)} />
          </linearGradient>
          <linearGradient id={`${uid}-earth`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint(HUE.body, 34)} />
            <stop offset="1" stopColor={tint(HUE.body, 52)} />
          </linearGradient>
          <linearGradient id={`${uid}-shore`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor={tint(HUE.mind, 55)} stopOpacity="0" />
            <stop offset="0.5" stopColor={tint("#7a8f6a", 55)} />
            <stop offset="1" stopColor={tint(HUE.body, 60)} stopOpacity="0" />
          </linearGradient>
          <linearGradient id={`${uid}-beam`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0" stopColor="#fff4d6" stopOpacity="0.75" />
            <stop offset="0.55" stopColor="#fff4d6" stopOpacity="0.25" />
            <stop offset="1" stopColor="#fff4d6" stopOpacity="0" />
          </linearGradient>
        </defs>

        {/* Layers */}
        <g style={fade("emotion")}><rect x="0" y="0" width={W} height="104" fill={`url(#${uid}-air)`} /></g>
        <g style={fade("mind")}><rect x="0" y="100" width={W} height="102" fill={`url(#${uid}-water)`} /></g>
        <g style={fade("body")}>
          <rect x="0" y="200" width={W} height="100" fill={`url(#${uid}-earth)`} />
          {[[38, 290, 5], [92, 278, 3], [150, 293, 4], [212, 284, 3], [268, 294, 4.5], [330, 282, 3.5], [372, 292, 4]].map(([x, y, r], k) => (
            <ellipse key={k} cx={x} cy={y} rx={r * 1.5} ry={r} fill={tint("#6b4e33", 40)} opacity="0.55" />
          ))}
        </g>

        {/* Light, slanting down through the air into the water */}
        {!compact && (
          <g className={alive ? "ana-pond-beams" : undefined} style={{ mixBlendMode: "soft-light" }}>
            {[[250, 26], [300, 16], [338, 30]].map(([x, w], k) => (
              <polygon key={k} points={`${x},0 ${x + w},0 ${x + w - 70},200 ${x - 80},200`} fill={`url(#${uid}-beam)`} opacity={0.9 - k * 0.2} />
            ))}
          </g>
        )}

        {/* The shoreline between mind and body */}
        <rect x="0" y="194" width={W} height="12" fill={`url(#${uid}-shore)`} />
        <path
          d={`M 0 201 ${Array.from({ length: 10 }, (_, k) => `q 20 ${k % 2 ? 2.5 : -2.5} 40 0`).join(" ")}`}
          fill="none"
          stroke={tint("#6e7d52", 70)}
          strokeWidth="1.2"
          strokeLinecap="round"
          opacity="0.8"
        />

        {/* The surface: a slow travelling wave */}
        <g className={alive ? "ana-pond-wave" : undefined}>
          <path
            d={`M -400 100 ${Array.from({ length: 16 }, (_, k) => `q 25 ${k % 2 ? 5 : -5} 50 0`).join(" ")}`}
            fill="none"
            stroke={tint(HUE.mind, 75)}
            strokeWidth="1.6"
            strokeLinecap="round"
          />
        </g>

        {/* Layer names, bottom-right of each layer */}
        {!compact &&
          ORDER.map((k) => (
            <text key={k} x={W - 14} y={BAND[k] + 92} textAnchor="end" fontFamily="var(--font-ui)" fontSize="9" fontWeight="700" letterSpacing="2.2" fill={`color-mix(in srgb, ${HUE[k]} 60%, var(--ink))`} opacity={focus && focus !== k ? 0.35 : 0.75}>
              {k.toUpperCase()}
            </text>
          ))}

        {/* Words */}
        {ORDER.map((k) => {
          const placed = place(portrait?.[k].words ?? [], k, compact, portrait?.weights);
          if (!placed.length && !compact) {
            return <text key={k} x="22" y={BAND[k] + 56} fontFamily="var(--font-display)" fontSize="17" fill="var(--ink-soft)" opacity="0.35">…</text>;
          }
          return (
            <g key={k} opacity={focus && focus !== k ? 0.3 : 1} style={{ transition: "opacity .4s" }}>
              {placed.map((p) => {
                const tone = toneStyle(p.word, portrait?.weights);
                const light = p.weight > 0.3;
                const heavy = p.weight < -0.3;
                const cls = !alive ? undefined : light ? "ana-pond-rise" : heavy ? "ana-pond-rest" : "ana-pond-drift";
                const delay = `${-(p.i * 1.7 + ORDER.indexOf(k) * 0.9)}s`;
                const mx = p.x + 4;
                const my = p.y - 5;
                return (
                  <motion.g
                    key={p.word}
                    initial={reduce ? false : { opacity: 0, y: p.weight * -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.9, delay: reduce ? 0 : 0.15 + ORDER.indexOf(k) * 0.12 + p.i * 0.07, ease: EASE }}
                  >
                    {/* colour variables live on a plain element: the animated wrapper doesn't pass them on */}
                    <g className={cls} style={{ ...tone, animationDelay: delay }}>
                      {compact && <circle cx={mx} cy={my} r="7" className="tone-fill" />}
                      {!compact && (
                        <text
                          x={p.x}
                          y={p.y}
                          fontFamily="var(--font-display)"
                          fontSize="16.5"
                          fontWeight="500"
                          className="tone-ink"
                        >
                          {p.word}
                        </text>
                      )}
                    </g>
                  </motion.g>
                );
              })}
            </g>
          );
        })}

        {/* Tap targets, one per layer */}
        {interactive &&
          ORDER.map((k) => (
            <rect
              key={k}
              x="0"
              y={BAND[k]}
              width={W}
              height="100"
              fill="transparent"
              className="cursor-pointer outline-none"
              role="button"
              tabIndex={0}
              aria-pressed={focus === k}
              aria-label={`${k}: ${portrait?.[k].words.join(", ") || "nothing chosen yet"}`}
              onClick={() => setFocus((f) => (f === k ? null : k))}
              onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && (e.preventDefault(), setFocus((f) => (f === k ? null : k)))}
            />
          ))}
      </svg>

      {interactive && (
        <div className="w-full min-h-[8px]">
          <AnimatePresence mode="wait">
            {focused && (
              <motion.div
                key={focused.key}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -4 }}
                transition={{ duration: 0.35, ease: EASE }}
                className="mt-3 px-1"
              >
                <p className="font-ui text-[11px] font-bold tracking-[0.16em] uppercase" style={{ color: `color-mix(in srgb, ${HUE[focused.key]} 60%, var(--ink))` }}>{focused.label}</p>
                <p className="mt-0.5 font-display text-[17px] font-semibold leading-snug">
                  {(portrait?.[focused.key].words ?? []).length ? (
                    portrait![focused.key].words.map((w, i) => (
                      <span key={w}>
                        {i > 0 && <span className="text-ink-soft/50"> · </span>}
                        <span className="tone-text" style={toneStyle(w, portrait?.weights)}>{w}</span>
                      </span>
                    ))
                  ) : (
                    <span className="text-ink-soft">Nothing chosen yet</span>
                  )}
                </p>
                {portrait?.[focused.key].note && <p className="font-serif italic text-[15px] leading-[1.5] text-ink-soft mt-0.5">{portrait[focused.key].note}</p>}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </figure>
  );
}

function describe(p: Portrait | null) {
  if (!p) return "Three empty layers: emotion above the water, mind in it, body in the earth below.";
  return ORDER.map((k) => `${k}: ${p[k].words.join(", ") || "nothing chosen"}`).join(". ");
}
