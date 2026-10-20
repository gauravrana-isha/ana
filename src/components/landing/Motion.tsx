"use client";

import Image from "next/image";
import { Fragment, useEffect, useRef, useState } from "react";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { cn } from "@/lib/utils";

/*
 * The landing page's motion, all slow and breath-paced, never bouncing, and still for anyone who
 * asks their device for less motion. Each piece starts when it comes into view.
 */

/** True once the element has come into view (and stays true). */
function useSeen<T extends Element>(margin = "-15% 0px") {
  const ref = useRef<T>(null);
  const [seen, setSeen] = useState(false);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      ([e]) => {
        if (e.isIntersecting) {
          setSeen(true);
          io.disconnect();
        }
      },
      { rootMargin: margin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [margin]);
  return [ref, seen] as const;
}

const reduced = () => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

// ---------------------------------------------------------------- the hero loop

/** The app in use, recorded from the real thing: muted, looping, light or dark to match. */
export function HeroLoop() {
  return (
    <div className="relative rounded-[42px] p-[8px] bg-[#1d1b17] shadow-[0_40px_80px_-30px_rgba(24,22,15,0.5)] ring-1 ring-black/10 dark:ring-white/10 w-[min(72vw,290px)]">
      <div className="relative overflow-hidden rounded-[34px] bg-bg aspect-[390/844]">
        {(["light", "dark"] as const).map((t) => (
          <video
            key={t}
            className={cn("absolute inset-0 w-full h-full object-cover object-top", t === "light" ? "landing-shot-light" : "landing-shot-dark")}
            src={`/landing/hero-${t}.mp4`}
            poster={`/landing/hero-${t}.webp`}
            autoPlay
            muted
            loop
            playsInline
            preload="metadata"
            aria-label={t === "light" ? "ana in use: a practice ticked, the evening question written, a photo kept as a moment" : undefined}
            aria-hidden={t === "dark" || undefined}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the sticky phone

export interface Step {
  shot: string;
  alt: string;
}

/**
 * Wider screens: the phone stays while the text beside it scrolls past, and its screen fades to
 * whichever step is in view (marked in the text with data-step="<index>").
 */
export function StickyPhone({ steps }: { steps: readonly Step[] }) {
  const [at, setAt] = useState(0);
  useEffect(() => {
    const marks = [...document.querySelectorAll<HTMLElement>("[data-step]")];
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) if (e.isIntersecting) setAt(Number((e.target as HTMLElement).dataset.step));
      },
      { rootMargin: "-45% 0px -45% 0px" }
    );
    marks.forEach((m) => io.observe(m));
    return () => io.disconnect();
  }, []);
  return (
    <div className="sticky top-24 flex justify-center">
      <div className="relative rounded-[42px] p-[8px] bg-[#1d1b17] shadow-[0_40px_80px_-30px_rgba(24,22,15,0.5)] ring-1 ring-black/10 dark:ring-white/10 w-[290px]">
        <div className="relative overflow-hidden rounded-[34px] bg-bg aspect-[390/844]">
          {steps.map((s, i) =>
            (["light", "dark"] as const).map((t) => (
              <Image
                key={s.shot + t}
                src={`/landing/${s.shot}-${t}.webp`}
                alt={i === at && t === "light" ? s.alt : ""}
                aria-hidden={i !== at || t === "dark" || undefined}
                fill
                sizes="290px"
                className={cn(
                  "object-cover object-top transition-opacity duration-[900ms] ease-out",
                  i === at ? "opacity-100" : "opacity-0",
                  t === "light" ? "landing-shot-light" : "landing-shot-dark"
                )}
              />
            ))
          )}
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------- the badge, played in view

/** A section's badge plays its own little motion (a tick drawn in, a flame) once it's seen. */
export function SeenBadge({ k, size = 44 }: { k: string; size?: number }) {
  const [ref, seen] = useSeen<HTMLSpanElement>();
  return (
    <span ref={ref} className="inline-grid">
      <FeatureBadge key={seen ? "on" : "off"} k={k} size={size} play={seen} />
    </span>
  );
}

// ---------------------------------------------------------------- words sealed as they leave

const CIPHER = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789-_";
const SEALED = "e1:Qm9n7XcZ2a_kLr0pW8yHt4vE1sJdG6uBfNq3oYx";

/**
 * "Sat by the river this morning…" turning into the sealed text that leaves the phone: one
 * letter after another, over about three seconds, once it's in view.
 */
export function SealedLine({ text }: { text: string }) {
  const [ref, seen] = useSeen<HTMLParagraphElement>("-25% 0px");
  const [shown, setShown] = useState(text);
  const [done, setDone] = useState(false);
  useEffect(() => {
    if (!seen) return;
    // Less motion: shown sealed straight away (still in a frame callback, not mid-render).
    if (reduced()) {
      const f = requestAnimationFrame(() => {
        setShown(SEALED);
        setDone(true);
      });
      return () => cancelAnimationFrame(f);
    }
    const start = performance.now();
    const len = Math.max(text.length, SEALED.length);
    let frame = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / 3000);
      const edge = Math.floor(t * len);
      let out = "";
      for (let i = 0; i < len; i++) {
        if (i < edge) out += SEALED[i] ?? "";
        else if (i < edge + 3) out += CIPHER[Math.floor(Math.random() * CIPHER.length)];
        else out += text[i] ?? "";
      }
      setShown(out);
      if (t < 1) frame = requestAnimationFrame(tick);
      else setDone(true);
    };
    const wait = setTimeout(() => (frame = requestAnimationFrame(tick)), 600);
    return () => {
      clearTimeout(wait);
      cancelAnimationFrame(frame);
    };
  }, [seen, text]);
  return (
    <p ref={ref} aria-label={`"${text}", sealed before it leaves your phone`} className="font-mono text-[14px] sm:text-[15.5px] leading-[1.6] break-all text-bg/90 min-h-[3.2em]">
      <span aria-hidden="true">{shown}</span>
      <span aria-hidden="true" className={cn("ml-0.5 inline-block w-[0.55em] h-[1.1em] align-[-0.18em] bg-bg/70", done ? "opacity-0" : "animate-pulse")} />
    </p>
  );
}

// ---------------------------------------------------------------- a yantra drawing itself

const C = 200;
const pt = (r: number, deg: number) => {
  const a = ((deg - 90) * Math.PI) / 180;
  return [C + r * Math.cos(a), C + r * Math.sin(a)].map((v) => Math.round(v * 10) / 10);
};
/** A ring of lotus petals between two radii. */
function petals(n: number, r1: number, r2: number, phase = 0) {
  const half = 180 / n;
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i * 360) / n;
    const [x1, y1] = pt(r1, a - half);
    const [x2, y2] = pt(r1, a + half);
    const [tx, ty] = pt(r2, a);
    const [c1x, c1y] = pt(r2 * 0.92, a - half * 0.55);
    const [c2x, c2y] = pt(r2 * 0.92, a + half * 0.55);
    return `M${x1} ${y1} Q${c1x} ${c1y} ${tx} ${ty} Q${c2x} ${c2y} ${x2} ${y2}`;
  }).join(" ");
}
const circle = (r: number) => `M${C} ${C - r} a${r} ${r} 0 1 1 0 ${2 * r} a${r} ${r} 0 1 1 0 ${-2 * r}`;
/** The square enclosure with a gate on each side (bhupura). */
function bhupura(h: number, gate: number, depth: number) {
  const a = C - h, b = C + h, g1 = C - gate, g2 = C + gate;
  return [
    `M${a} ${a} L${g1} ${a} L${g1} ${a - depth} L${g2} ${a - depth} L${g2} ${a} L${b} ${a}`,
    `L${b} ${g1} L${b + depth} ${g1} L${b + depth} ${g2} L${b} ${g2} L${b} ${b}`,
    `L${g2} ${b} L${g2} ${b + depth} L${g1} ${b + depth} L${g1} ${b} L${a} ${b}`,
    `L${a} ${g2} L${a - depth} ${g2} L${a - depth} ${g1} L${a} ${g1} Z`,
  ].join(" ");
}
const triangle = (r: number, up: boolean) => {
  const [p1, p2, p3] = (up ? [0, 120, 240] : [180, 300, 60]).map((d) => pt(r, d));
  return `M${p1[0]} ${p1[1]} L${p2[0]} ${p2[1]} L${p3[0]} ${p3[1]} Z`;
};

/**
 * A yantra in the journal's ink: the square with four gates, three circles, sixteen petals,
 * eight petals, a circle, two interlocking triangles and, at the centre, the bindu. Drawn from
 * the outside in, as attention moves inward, arriving at the point at the centre.
 */
const YANTRA = [
  { d: bhupura(176, 34, 14), w: 1.6 },
  { d: bhupura(166, 30, 10), w: 1 },
  { d: `${circle(152)} ${circle(146)}`, w: 1.2 },
  { d: petals(16, 112, 146), w: 1.4 },
  { d: circle(112), w: 1.2 },
  { d: petals(8, 78, 112, 22.5), w: 1.5 },
  { d: circle(78), w: 1.2 },
  { d: triangle(70, true), w: 1.6 },
  { d: triangle(70, false), w: 1.6 },
];

export function Yantra({ className, draw = true }: { className?: string; draw?: boolean }) {
  const [ref, seen] = useSeen<SVGSVGElement>("-20% 0px");
  const on = !draw || seen;
  return (
    <svg ref={ref} viewBox="0 0 400 400" fill="none" aria-hidden="true" className={cn("landing-yantra", className)}>
      {YANTRA.map((p, i) => (
        <path
          key={i}
          d={p.d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={p.w}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={draw ? { strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset 2.4s cubic-bezier(0.45, 0, 0.25, 1) ${0.4 + i * 0.75}s` } : undefined}
        />
      ))}
      {/* The bindu: here, now. It arrives last, and breathes. */}
      <circle cx={C} cy={C} r="5" fill="currentColor" className={draw ? "landing-bindu" : undefined} style={draw ? { opacity: on ? 1 : 0, transition: `opacity 1.2s ease ${0.4 + YANTRA.length * 0.75}s` } : undefined} />
    </svg>
  );
}

// ---------------------------------------------------------------- the main line

/** The main line: its words arrive one by one, then "here and now" lights up, underlined in ink. */
export function HeroLine() {
  const words = ["Absolute", "devotion", "to", "what's"];
  return (
    <h1 className="mt-5 font-display text-[clamp(38px,6.2vw,66px)] font-semibold leading-[1.06] tracking-[-0.025em] text-balance">
      {words.map((w, i) => (
        // The space sits outside each word (inside an inline-block it would be dropped).
        <Fragment key={w}>
          <span className="landing-word" style={{ animationDelay: `${0.15 + i * 0.16}s` }}>
            {w}
          </span>{" "}
        </Fragment>
      ))}
      <span className="landing-word relative inline-block whitespace-nowrap text-accent" style={{ animationDelay: `${0.15 + words.length * 0.16}s` }}>
        here and now
        <svg aria-hidden="true" viewBox="0 0 300 24" preserveAspectRatio="none" className="absolute left-0 -bottom-[0.12em] w-[96%] h-[0.32em] text-accent overflow-visible">
          <path d="M3 15 C 60 7, 120 19, 180 11 S 270 9, 297 13" pathLength={1} stroke="currentColor" strokeWidth={5} strokeLinecap="round" fill="none" className="landing-ink" />
        </svg>
      </span>
    </h1>
  );
}

// ---------------------------------------------------------------- two words, one meaning

/** "Vasari" and "Logger" (the same thing, in Sanskrit and English) gently trading places. */
export function SwapWord({ words }: { words: readonly [string, string] }) {
  const [i, setI] = useState(0);
  const [widths, setWidths] = useState<number[]>([]);
  const refs = useRef<(HTMLSpanElement | null)[]>([]);
  useEffect(() => {
    // Measured once fonts settle, so the slot fits the word showing (no gap after the shorter one).
    const measure = () => setWidths(refs.current.map((r) => r?.offsetWidth ?? 0));
    measure();
    document.fonts?.ready.then(measure);
    if (reduced()) return;
    const t = setInterval(() => setI((n) => (n + 1) % 2), 3200);
    return () => clearInterval(t);
  }, []);
  return (
    <span
      className="relative inline-grid align-baseline transition-[width] duration-700 ease-out"
      style={widths[i] ? { width: widths[i] } : undefined}
      aria-label={`${words[0]} (${words[1]})`}
    >
      {words.map((w, n) => (
        <span
          key={w}
          ref={(el) => {
            refs.current[n] = el;
          }}
          aria-hidden="true"
          className={cn("col-start-1 row-start-1 justify-self-start whitespace-nowrap transition-all duration-700 ease-out", n === i ? "opacity-100 translate-y-0 blur-0" : "opacity-0 -translate-y-[0.35em] blur-[3px]")}
        >
          {w}
        </span>
      ))}
    </span>
  );
}
