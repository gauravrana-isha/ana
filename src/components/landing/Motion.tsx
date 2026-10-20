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
    <div className="sticky top-[65px] h-[calc(100svh-65px)] flex items-center justify-center">
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

/** The sticky header's height (64px and its 1px line), which every stop sits below. */
const head = () => document.querySelector<HTMLElement>(".landing-sky > header")?.offsetHeight ?? 64;

type Stop = { label: string; a: number; b: number };

/** Each [data-stop] as the scroll range where it fills the screen: a to b (equal unless it's taller). */
function measureStops(): Stop[] {
  const top = head();
  const view = innerHeight - top;
  const max = document.documentElement.scrollHeight - innerHeight;
  return [...document.querySelectorAll<HTMLElement>("[data-stop]")].map((el) => {
    const r = el.getBoundingClientRect();
    const a = Math.min(Math.round(r.top + scrollY - top), max);
    return { label: el.dataset.stop ?? "", a, b: Math.min(Math.max(a, Math.round(a + r.height - view)), max) };
  });
}

/**
 * The page moves a section at a time, like a product page. One swipe of the trackpad, turn of the
 * wheel or press of a key goes to the next section in that direction, and the glide a trackpad
 * keeps sending after a swipe is spent, never counted as another swipe. A section taller than the
 * screen scrolls as usual, stopping at its end before the next. On touch, wherever a swipe comes
 * to rest between two sections, it settles into the next one in the swipe's direction.
 * A bar at the bottom shows where you are, and takes you to any section.
 */
export function SectionPager() {
  const [stops, setStops] = useState<Stop[]>([]);
  const [at, setAt] = useState({ i: 0, f: 0 });
  const goRef = useRef<(to: number) => void>(() => {});

  useEffect(() => {
    const root = document.documentElement;
    const still = reduced();
    if (!still) root.classList.add("landing-paged");

    const marks = () => {
      const max = root.scrollHeight - innerHeight;
      return [...new Set([...measureStops().flatMap((s) => [s.a, s.b]), max])].sort((x, y) => x - y);
    };
    const nextMark = (y: number, dir: number) => {
      const m = marks();
      return dir > 0 ? m.find((v) => v > y + 2) : m.reverse().find((v) => v < y - 2);
    };
    // The tall section the page is reading through, if any.
    const tallAt = (y: number) => measureStops().find((s) => s.b > s.a && y >= s.a - 2 && y <= s.b + 2);

    let busy = false;
    let anchor = scrollY;
    const go = (to: number) => {
      busy = true;
      anchor = to;
      scrollTo({ top: to, behavior: still ? "auto" : "smooth" });
      const t0 = performance.now();
      const wait = () => {
        if (Math.abs(scrollY - to) < 2 || performance.now() - t0 > 1200) busy = false;
        else requestAnimationFrame(wait);
      };
      requestAnimationFrame(wait);
    };
    goRef.current = go;

    // Where you are, for the bar: the stop reached, and how far through it (tall ones).
    let frame = 0;
    const track = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const list = measureStops();
        const y = scrollY;
        let i = 0;
        list.forEach((s, k) => {
          if (y >= s.a - 2) i = k;
        });
        const s = list[i];
        setAt({ i, f: s && s.b > s.a ? Math.min(1, Math.max(0, (y - s.a) / (s.b - s.a))) : 1 });
      });
    };
    const remeasure = () => {
      setStops(measureStops());
      track();
    };
    remeasure();
    // Opened part way down (a reload puts back where you were): sit on the nearest stop.
    anchor = scrollY;
    const opened = setTimeout(() => settle(false), 300);

    // A swipe is told from its glide: the glide comes without pauses and only slows down. So a
    // new swipe is a pause (over 160 ms), or, once the glide has begun to fade, a push harder
    // than the last few. (A swipe's own start speeds up too, which is why the fade comes first.)
    let lastAt = 0;
    let recent: number[] = [];
    let peak = 0;
    let fading = false;
    let spent = false; // the gesture that moved the page is still going (its glide)
    const onWheel = (e: WheelEvent) => {
      if (still || e.ctrlKey || Math.abs(e.deltaX) > Math.abs(e.deltaY) || !e.deltaY) return;
      const now = performance.now();
      const size = Math.abs(e.deltaY);
      const gap = now - lastAt;
      lastAt = now;
      if (gap > 160) {
        peak = 0;
        fading = false;
        recent = [];
      }
      const fresh = gap > 160 || (fading && recent.length >= 2 && size > Math.max(...recent.slice(-3)) + 4);
      if (fresh) {
        peak = 0;
        fading = false;
      }
      peak = Math.max(peak, size);
      if (size < peak * 0.6) fading = true;
      recent = [...recent.slice(-4), size];
      const dir = Math.sign(e.deltaY);
      // Swiped again while moving: carry on to the one after.
      if (busy) {
        e.preventDefault();
        if (fresh) {
          const stop = nextMark(anchor, dir);
          if (stop !== undefined) go(stop);
        }
        return;
      }
      if (spent) {
        if (!fresh) return e.preventDefault();
        spent = false;
      }
      const y = scrollY;
      const to = y + e.deltaY;
      const tall = tallAt(y);
      if (tall && to >= tall.a && to <= tall.b) return; // reading through it: as usual
      e.preventDefault();
      if (tall && !fresh) {
        // The glide reached the end of a tall section: stop there; the next swipe moves on.
        scrollTo({ top: to < tall.a ? tall.a : tall.b });
        spent = true;
        return;
      }
      const stop = nextMark(y, dir);
      if (stop === undefined) return;
      spent = true;
      go(stop);
    };

    // Keys page the same way (not while typing).
    const onKey = (e: KeyboardEvent) => {
      if (still || e.metaKey || e.ctrlKey || e.altKey || (e.target as HTMLElement)?.closest?.("input, textarea, select, [contenteditable]")) return;
      const dir = ["PageDown", "ArrowDown"].includes(e.key) || (e.key === " " && !e.shiftKey) ? 1 : ["PageUp", "ArrowUp"].includes(e.key) || (e.key === " " && e.shiftKey) ? -1 : 0;
      if (!dir) return;
      const y = scrollY;
      const tall = tallAt(y);
      const step = e.key.startsWith("Arrow") ? 80 : innerHeight * 0.8;
      if (tall && y + dir * step >= tall.a && y + dir * step <= tall.b) return;
      e.preventDefault();
      const stop = nextMark(busy ? anchor : y, dir);
      if (stop !== undefined) go(stop);
    };

    // When the page comes to rest between two stops: after a swipe on a touch screen, go on to
    // the next one in its direction; after anything else (a reload putting back where you were,
    // a link, the page reflowing), to the nearest, without a direction to guess.
    let touching = false;
    let swipedAt = -1e9;
    let idle: ReturnType<typeof setTimeout> | undefined;
    const settle = (smooth = true) => {
      if (still || touching || busy) return;
      const y = scrollY;
      if (marks().some((m) => Math.abs(m - y) <= 2) || tallAt(y)) {
        anchor = y;
        return;
      }
      if (performance.now() - swipedAt < 2500) {
        const stop = nextMark(y, Math.sign(y - anchor) || 1);
        if (stop !== undefined) go(stop);
        return;
      }
      const nearest = marks().reduce((best, m) => (Math.abs(m - y) < Math.abs(best - y) ? m : best));
      if (smooth) go(nearest);
      else {
        anchor = nearest;
        scrollTo({ top: nearest });
      }
    };
    const onScroll = () => {
      track();
      clearTimeout(idle);
      idle = setTimeout(settle, 160);
    };
    // A finger on the screen takes over from any move under way.
    const onTouchStart = () => {
      touching = true;
      busy = false;
      anchor = scrollY;
    };
    const onTouchEnd = () => {
      touching = false;
      swipedAt = performance.now();
      onScroll();
    };

    addEventListener("wheel", onWheel, { passive: false });
    addEventListener("keydown", onKey);
    addEventListener("scroll", onScroll, { passive: true });
    addEventListener("resize", remeasure);
    addEventListener("load", remeasure);
    addEventListener("touchstart", onTouchStart, { passive: true });
    addEventListener("touchend", onTouchEnd, { passive: true });
    return () => {
      root.classList.remove("landing-paged");
      clearTimeout(idle);
      clearTimeout(opened);
      cancelAnimationFrame(frame);
      removeEventListener("wheel", onWheel);
      removeEventListener("keydown", onKey);
      removeEventListener("scroll", onScroll);
      removeEventListener("resize", remeasure);
      removeEventListener("load", remeasure);
      removeEventListener("touchstart", onTouchStart);
      removeEventListener("touchend", onTouchEnd);
    };
  }, []);

  if (stops.length < 2) return null;
  return (
    <nav aria-label="Sections" className="landing-progress fixed left-1/2 -translate-x-1/2 bottom-[max(16px,env(safe-area-inset-bottom))] z-30">
      <ol className="flex items-center gap-1.5 rounded-full bg-bg/80 backdrop-blur-md ring-1 ring-line/80 shadow-[0_10px_30px_-14px_rgba(20,18,12,0.35)] px-3 py-2.5">
        {stops.map((s, k) => {
          const fill = k < at.i ? 1 : k === at.i ? at.f : 0;
          return (
            <li key={s.label + k} className="flex">
              <button
                type="button"
                onClick={() => goRef.current(s.a)}
                aria-label={s.label}
                aria-current={k === at.i ? "step" : undefined}
                title={s.label}
                className="group relative grid place-items-center h-4 -my-1"
              >
                <span
                  className={cn(
                    "relative block h-[5px] rounded-full overflow-hidden transition-[width,background-color] duration-500 ease-out",
                    k === at.i ? "w-7 bg-accent/25" : "w-[5px] sm:w-2.5 bg-ink/15 group-hover:bg-ink/30"
                  )}
                >
                  <span className="absolute inset-y-0 left-0 rounded-full bg-accent transition-[width] duration-300 ease-out" style={{ width: `${fill * 100}%` }} />
                </span>
              </button>
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/** When a yantra layer (its index in YANTRA) starts drawing. */
const drawsAt = (i: number) => 0.4 + i * 0.75;

/**
 * A temple pillar in straight lines: a stepped base, a shaft of four lines broken by a carved
 * block at its middle (a ring above and below, a diamond within), a stepped capital. Listed
 * bottom to top, the order it rises in, each with when it starts and how long it draws.
 */
const PILLAR: { d: string; at: number; for: number; w: number }[] = [
  { d: "M0 440 H60 V432 H54 V424 H48 V416 H12 V424 H6 V432 H0 Z", at: 0, for: 1.6, w: 1.4 },
  ...[16, 25, 35, 44].map((x, k) => ({ d: `M${x} 416 V250 M${x} 190 V24`, at: 0.8 + k * 0.15, for: 3, w: 1.1 })),
  { d: "M8 250 H52 V190 H8 Z", at: 2.2, for: 1.4, w: 1.3 },
  { d: "M12 256 H48 M12 184 H48", at: 2.6, for: 1, w: 1 },
  { d: "M30 198 L44 220 L30 242 L16 220 Z", at: 3, for: 1.2, w: 1.1 },
  { d: "M0 0 H60 V8 H54 V16 H48 V24 H12 V16 H6 V8 H0 Z", at: 3.8, for: 1.6, w: 1.4 },
];

function Pillar({ on, className }: { on: boolean; className?: string }) {
  return (
    <svg aria-hidden="true" viewBox="0 0 60 440" fill="none" className={cn("pointer-events-none absolute top-1/2 -translate-y-1/2 h-[112%] w-auto text-accent/70", className)}>
      {PILLAR.map((p, i) => (
        <path
          key={i}
          d={p.d}
          pathLength={1}
          stroke="currentColor"
          strokeWidth={p.w}
          strokeLinejoin="round"
          strokeLinecap="round"
          style={{ strokeDasharray: 1, strokeDashoffset: on ? 0 : 1, transition: `stroke-dashoffset ${p.for}s cubic-bezier(0.45, 0, 0.25, 1) ${drawsAt(0) + 0.6 + p.at}s` }}
        />
      ))}
    </svg>
  );
}

/** The yantra drawing itself, outside in, between two pillars rising beside it (wider screens). */
export function PillarYantra({ className }: { className?: string }) {
  const [ref, seen] = useSeen<HTMLDivElement>("-20% 0px");
  return (
    <div ref={ref} className={cn("relative", className)}>
      <Pillar on={seen} className="hidden sm:block right-full mr-[clamp(40px,9vw,150px)]" />
      <Pillar on={seen} className="hidden sm:block left-full ml-[clamp(40px,9vw,150px)]" />
      <Yantra show={seen} className="w-[min(78vw,340px)] lg:w-[min(380px,calc(100svh-360px))] h-auto text-accent" />
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

