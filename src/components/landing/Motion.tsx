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
    // A screen tall below the header, so the phone stays centred beside each step; on short
    // screens it shrinks to fit.
    <div className="sticky top-16 h-[calc(100svh-64px)] flex items-center justify-center">
      <div className="relative rounded-[42px] p-[8px] bg-[#1d1b17] shadow-[0_40px_80px_-30px_rgba(24,22,15,0.5)] ring-1 ring-black/10 dark:ring-white/10 w-[min(290px,calc((100svh-128px)*0.462))]">
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

export function Yantra({ className, draw = true, show }: { className?: string; draw?: boolean; show?: boolean }) {
  const [ref, seen] = useSeen<SVGSVGElement>("-20% 0px");
  const on = !draw || (show ?? seen);
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

// ---------------------------------------------------------------- a screen at a time

const HEAD = 64;

/**
 * The page moves a section at a time, like a product page: one turn of the wheel (or swipe of the
 * trackpad) goes to the next section in that direction, never stopping halfway between two. A
 * section taller than the screen scrolls as usual until its end. On touch, wherever a swipe comes
 * to rest between two sections, it settles into the next one in the swipe's direction.
 * Stops are the elements marked .landing-snap / .landing-snap-start, and the very end.
 */
export function SectionPager() {
  useEffect(() => {
    if (reduced()) return;
    const root = document.documentElement;
    root.classList.add("landing-paged");

    // Each stop as the scroll range where it fills the screen: [start, end], equal unless taller.
    const ranges = () => {
      const view = innerHeight - HEAD;
      const max = root.scrollHeight - innerHeight;
      const out = [...document.querySelectorAll<HTMLElement>(".landing-snap, .landing-snap-start")].map((el) => {
        const r = el.getBoundingClientRect();
        const start = Math.round(r.top + scrollY - HEAD);
        return [Math.min(start, max), Math.min(Math.max(start, Math.round(start + r.height - view)), max)] as const;
      });
      out.push([max, max]);
      return out;
    };
    const resting = (y: number) => ranges().some(([a, b]) => y >= a - 2 && y <= b + 2);
    const nextStop = (y: number, dir: number) => {
      const marks = [...new Set(ranges().flat())].sort((a, b) => a - b);
      return dir > 0 ? marks.find((m) => m > y + 2) : marks.reverse().find((m) => m < y - 2);
    };

    let busy = false;
    let cooling = false;
    let lastWheel = 0;
    let anchor = scrollY;
    let touching = false;
    let idle: ReturnType<typeof setTimeout> | undefined;

    const go = (to: number) => {
      busy = true;
      anchor = to;
      scrollTo({ top: to, behavior: "smooth" });
      const t0 = performance.now();
      const wait = () => {
        if (Math.abs(scrollY - to) < 2 || performance.now() - t0 > 1200) busy = false;
        else requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
    };

    const onWheel = (e: WheelEvent) => {
      if (e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
      const now = performance.now();
      const gap = now - lastWheel;
      lastWheel = now;
      // While moving, and through the trackpad's glide after it, the gesture is spent.
      if (busy || (cooling && gap < 220)) return e.preventDefault();
      cooling = false;
      const y = scrollY;
      const to = y + e.deltaY;
      // Reading through a tall section: scroll as usual.
      if (ranges().some(([a, b]) => b > a && y >= a - 2 && y <= b + 2 && to >= a && to <= b)) return;
      const stop = nextStop(y, Math.sign(e.deltaY));
      if (stop === undefined) return;
      e.preventDefault();
      cooling = true;
      go(stop);
    };

    // Touch, keys, anything else: when the page comes to rest between two stops, go on to the
    // next one in the direction it was moving.
    const settle = () => {
      if (touching || busy) return;
      const y = scrollY;
      if (resting(y)) {
        anchor = y;
        return;
      }
      const stop = nextStop(y, Math.sign(y - anchor) || 1);
      if (stop !== undefined) go(stop);
    };
    const onScroll = () => {
      clearTimeout(idle);
      idle = setTimeout(settle, 140);
    };
    const onTouchStart = () => {
      touching = true;
      if (!busy) anchor = scrollY;
    };
    const onTouchEnd = () => {
      touching = false;
      onScroll();
    };

    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.classList.remove("landing-paged");
      clearTimeout(idle);
      removeEventListener("wheel", onWheel);
      removeEventListener("scroll", onScroll);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
    };
  }, []);
  return null;
}

/** When a yantra layer (its index in YANTRA) starts drawing. */
const drawsAt = (i: number) => 0.4 + i * 0.75;

const LEGEND = [
  { side: "left", top: "8%", at: 0, name: "Bhupura", line: "The square with four gates: the world, and the way in." },
  { side: "left", top: "50%", at: 2, name: "Circles", line: "Time turning, from the outer towards the inner." },
  { side: "left", top: "92%", at: 3, name: "Sixteen petals", line: "The lotus beginning to open." },
  { side: "right", top: "8%", at: 5, name: "Eight petals", line: "Opening further, nearer the centre." },
  { side: "right", top: "50%", at: 7, name: "Two triangles", line: "Effort and grace, the outer and the inner, held as one." },
  { side: "right", top: "92%", at: YANTRA.length, name: "Bindu", line: "The one point. Here, now." },
] as const;

/** The yantra drawing itself, outside in, each part named at the sides as it arrives (wide screens). */
export function YantraLegend({ className }: { className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>("-20% 0px");
  return (
    <div ref={ref} className={cn("relative", className)}>
      <Yantra show={seen} className="w-[min(78vw,340px)] lg:w-[min(380px,calc(100svh-360px))] h-auto text-accent" />
      {LEGEND.map((l) => (
        <div
          key={l.name}
          className={cn(
            "hidden lg:flex absolute w-[250px] xl:w-[280px] items-center gap-4",
            l.side === "left" ? "right-full mr-8 flex-row-reverse text-right" : "left-full ml-8 text-left"
          )}
          style={{
            top: l.top,
            opacity: seen ? 1 : 0,
            transform: `translate(${seen ? 0 : l.side === "left" ? -12 : 12}px, -50%)`,
            transition: `opacity 1.2s ease ${drawsAt(l.at) + 0.6}s, transform 1.2s ease ${drawsAt(l.at) + 0.6}s`,
          }}
        >
          <span aria-hidden="true" className="relative h-px w-14 shrink-0 bg-accent/35">
            <span className={cn("absolute top-1/2 -translate-y-1/2 w-1.5 h-1.5 rounded-full bg-accent/60", l.side === "left" ? "right-0" : "left-0")} />
          </span>
          <div>
            <p className="font-ui text-[11.5px] font-semibold uppercase tracking-[0.14em] text-accent">{l.name}</p>
            <p className="mt-1 font-serif italic text-[15.5px] leading-[1.45] text-ink-soft">{l.line}</p>
          </div>
        </div>
      ))}
    </div>
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
