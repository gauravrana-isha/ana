"use client";

import Image from "next/image";
import { useEffect, useRef, useState } from "react";
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

// ---------------------------------------------------------------- a kolam drawing itself

const DOTS: [number, number][] = [];
for (let x = 0; x < 5; x++) for (let y = 0; y < 5; y++) if (Math.abs(x - 2) + Math.abs(y - 2) <= 3) DOTS.push([60 + x * 40, 60 + y * 40]);

/** A pulli kolam (loops around a grid of dots), drawn by a slow hand once it's in view. */
export function DrawnKolam({ className }: { className?: string }) {
  const [ref, seen] = useSeen<SVGSVGElement>("-20% 0px");
  // Petals round the centre, loops round the rows, a frame with curled corners.
  const strokes = [
    "M140 100 C175 100 180 140 140 140 C100 140 105 100 140 100 Z",
    "M140 180 C175 180 180 140 140 140 C100 140 105 180 140 180 Z",
    "M100 140 C100 105 140 100 140 140 C140 180 100 175 100 140 Z",
    "M180 140 C180 105 140 100 140 140 C140 180 180 175 180 140 Z",
    "M140 40 C190 40 240 90 240 140 C240 190 190 240 140 240 C90 240 40 190 40 140 C40 90 90 40 140 40 Z",
    "M100 60 C70 60 60 70 60 100 M180 60 C210 60 220 70 220 100 M220 180 C220 210 210 220 180 220 M60 180 C60 210 70 220 100 220",
    "M140 20 C150 30 150 40 140 50 C130 40 130 30 140 20 M260 140 C250 150 240 150 230 140 C240 130 250 130 260 140 M140 260 C130 250 130 240 140 230 C150 240 150 250 140 260 M20 140 C30 130 40 130 50 140 C40 150 30 150 20 140",
  ];
  return (
    <svg ref={ref} viewBox="0 0 280 280" fill="none" aria-hidden="true" className={cn("landing-kolam", className)}>
      {DOTS.map(([x, y], i) => (
        <circle key={i} cx={x} cy={y} r="2.6" fill="currentColor" className="transition-opacity duration-700" style={{ opacity: seen ? 0.55 : 0, transitionDelay: `${i * 40}ms` }} />
      ))}
      {strokes.map((d, i) => (
        <path
          key={i}
          d={d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{
            strokeDasharray: 1,
            strokeDashoffset: seen ? 0 : 1,
            transition: `stroke-dashoffset 2.6s cubic-bezier(0.45, 0, 0.25, 1) ${0.8 + i * 0.9}s`,
          }}
        />
      ))}
    </svg>
  );
}
