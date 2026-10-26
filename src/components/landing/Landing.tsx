import Image from "next/image";
import Link from "next/link";
import { BrandMark } from "@/components/art/BrandMark";
import { Ornament } from "@/components/art/Ornament";
import { Glyph } from "@/components/art/Glyphs";
import { DoneMark } from "@/components/art/PenMarks";
import { cn } from "@/lib/utils";
import { HeroLine, HeroLoop, SealedLine, SectionPager, SeenBadge, StickyPhone, Yantra, PillarYantra } from "./Motion";

/*
 * ana's front door, for anyone not signed in: what ana is, what it holds, why it's private,
 * and how to begin. One page, rendered on the server (fast, and readable by link previews),
 * phone-first, in the journal's own look. The screenshots and the hero loop are the real app,
 * filled with the staging journal's made-up data, in light and dark. The page reads as one day:
 * dawn at the top, the background deepening (barely) towards night as you scroll.
 */


export function Landing() {
  return (
    <div className="landing-sky min-h-dvh text-ink overflow-clip">
      <Header />
      <main>
        <Hero />
        <Inside />
        <Quiet />
        <Private />
        <Anywhere />
        <Begin />
        <Questions />
      </main>
      <Footer />
      <SectionPager />
    </div>
  );
}

// ---------------------------------------------------------------- pieces

function Wrap({ className, children }: { className?: string; children: React.ReactNode }) {
  return <div className={cn("mx-auto w-full max-w-[1120px] px-5 sm:px-8", className)}>{children}</div>;
}

function BeginButton({ className, children = "Begin" }: { className?: string; children?: React.ReactNode }) {
  return (
    <Link href="/login" className={cn("landing-cta group press", className)}>
      <span className="relative">{children}</span>
      <span aria-hidden="true" className="landing-cta-arrow">
        <svg viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
          <path d="M3 8h10M9 4l4 4-4 4" />
        </svg>
      </span>
    </Link>
  );
}

/** A phone showing a real screen of ana, light or dark to match the page. */
function Phone({ shot, alt, className, priority = false }: { shot: string; alt: string; className?: string; priority?: boolean }) {
  return (
    <div className={cn("relative rounded-[38px] p-[7px] bg-[#1d1b17] shadow-[0_30px_60px_-24px_rgba(24,22,15,0.45)] ring-1 ring-black/10 dark:ring-white/10", className)}>
      <div className="relative overflow-hidden rounded-[31px] bg-bg aspect-[390/844]">
        {(["light", "dark"] as const).map((t) => (
          <Image
            key={t}
            src={`/landing/${shot}-${t}.webp`}
            alt={t === "light" ? alt : ""}
            aria-hidden={t === "dark" || undefined}
            fill
            priority={priority}
            sizes="(min-width: 1024px) 300px, (min-width: 640px) 280px, 70vw"
            className={cn("object-cover object-top", t === "light" ? "landing-shot-light" : "landing-shot-dark")}
          />
        ))}
      </div>
    </div>
  );
}

function Eyebrow({ children }: { children: React.ReactNode }) {
  return <p className="font-ui text-[12.5px] font-semibold uppercase tracking-[0.12em] text-accent">{children}</p>;
}

/** The name inside an uppercase eyebrow: always lowercase, in the wordmark's face. */
function Ana() {
  return <span className="normal-case font-display text-[1.25em] font-semibold tracking-[0] leading-none">ana</span>;
}

/** Faint yantra geometry behind a section, sometimes turning very slowly. */
function Backdrop({ className, turn = false }: { className?: string; turn?: boolean }) {
  return <Yantra draw={false} className={cn("pointer-events-none absolute h-auto text-ink/[0.04]", turn && "landing-turn", className)} />;
}

// ---------------------------------------------------------------- sections

function Header() {
  return (
    <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-line/70">
      <Wrap className="flex items-center justify-between h-16 pt-[env(safe-area-inset-top)]">
        <Link href="/" className="flex items-center gap-2 text-accent" aria-label="ana">
          <BrandMark size={30} />
          <span className="font-display text-[26px] font-semibold text-ink tracking-[-0.01em] leading-none">ana</span>
        </Link>
        <nav aria-label="Page" className="flex items-center gap-1 sm:gap-2">
          <a href="#inside" className="hidden sm:inline-flex h-10 items-center px-3 rounded-full font-ui text-[14px] font-medium text-ink-soft hover:text-ink">What it holds</a>
          <a href="#private" className="hidden sm:inline-flex h-10 items-center px-3 rounded-full font-ui text-[14px] font-medium text-ink-soft hover:text-ink">Private</a>
          <Link href="/login" className="press inline-flex h-10 items-center px-4 rounded-full border border-line font-ui text-[14px] font-semibold text-ink hover:bg-surface">
            Sign in
          </Link>
        </nav>
      </Wrap>
    </header>
  );
}

function Hero() {
  return (
    <section data-stop="Here and now" className="landing-snap relative flex items-center">
      <Backdrop className="-right-40 -top-24 w-[760px]" turn />
      <Wrap className="relative grid lg:grid-cols-[1.05fr_1fr] items-center lg:gap-8 lg:pt-14 lg:pb-24">
        <div className="min-h-[calc(100svh-65px)] lg:min-h-0 flex flex-col justify-center py-8 lg:py-0 text-center lg:text-left lg:-mt-20">
          <HeroLine />
          <p className="mt-6 mx-auto lg:mx-0 max-w-[40ch] font-serif italic text-[16px] sm:text-[17px] leading-[1.6] text-ink-soft/75">
            Logger for you, your reflections and moments that matter.
          </p>
          <div className="mt-9 flex flex-col sm:flex-row items-center justify-center lg:justify-start gap-3">
            <BeginButton className="w-full sm:w-auto" />
            <a href="#inside" className="landing-ghost group press w-full sm:w-auto">
              See what it holds
              <svg aria-hidden="true" viewBox="0 0 16 16" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="landing-ghost-arrow">
                <path d="M8 3v10M4 9l4 4 4-4" />
              </svg>
            </a>
          </div>
          <Ornament name="flourish" width={140} className="mt-10 mx-auto lg:mx-0 text-ink-soft/40" />
        </div>

        {/* The app in use (a practice ticked, the evening question written, a photo kept), with
            Daily and Presence fanned out behind it. Below lg, a screen of its own. */}
        <div data-stop-mobile="The app in use" className="min-h-[calc(100svh-65px)] lg:min-h-0 flex items-center justify-center">
        <div className="relative mx-auto w-full max-w-[480px] h-[min(560px,calc(100svh-140px))] sm:h-[min(620px,calc(100svh-140px))] landing-rise [animation-delay:200ms]">
          <Phone shot="daily" alt="Daily reflection, one question at a time" className="absolute -left-6 sm:left-0 top-16 w-[44vw] max-w-[min(220px,calc((100svh-300px)*0.462))] -rotate-[7deg] opacity-95" />
          <Phone shot="presence" alt="Presence: the people and things in your moments" className="absolute -right-6 sm:right-0 top-16 w-[44vw] max-w-[min(220px,calc((100svh-300px)*0.462))] rotate-[7deg] opacity-95" />
          <div className="absolute left-1/2 -translate-x-1/2 top-0">
            <HeroLoop />
          </div>
        </div>
        </div>
      </Wrap>
    </section>
  );
}

const FEATURES = [
  {
    step: 0,
    mobile: { shot: "sadhana", alt: "Today's practices, each ticked with a tap" },
    badge: "tracker",
    eyebrow: "Sadhana",
    title: "Tick your practices. See your rhythm.",
    body: "Shambhavi, Isha Kriya, Surya Kriya, your waking time and anything else you keep. A tap marks it done; the weeks show the rhythm of your practice, gently, never as a score.",
    points: ["Your own practices, in your order", "Times, counts and minutes where they matter", "Patterns over the month, not streaks to keep"],
  },
  {
    step: 2,
    mobile: { shot: "daily", alt: "A daily question as a card, with room to write and stamps" },
    badge: "daily",
    eyebrow: "Reflection",
    title: "A few quiet questions, one at a time.",
    body: "Each evening, a few questions, one at a time. A line or two, and a mark for the day: growth, struggle, insight, stillness, devotion. Once a week, a longer look. And your sankalpa, to come back to.",
    points: ["Daily and weekly questions, your own if you like", "The day's mood in one tap", "Your sankalpa comes back when it's time to read it again"],
  },
  {
    step: 3,
    mobile: { shot: "moments", alt: "Moments, newest first" },
    badge: "expressions",
    eyebrow: "Presence",
    title: "Your experience and nothing more.",
    body: "A few words, your voice, a photo, a video. Just what was there: the river, the food, a friend, the mountain, the walk. It comes back to you on the day you choose, and on this day in years to come.",
    points: ["Words, voice, photos and video", "People and things alike, each with their moments", "Birthdays and moments that come back"],
  },
] as const;

/** The sticky phone's screens, in order; the text marks where each one shows (data-step). */
const STEPS = [
  { shot: "sadhana", alt: "Today's practices, each ticked with a tap" },
  { shot: "insights", alt: "Insights: the month of each practice, and mood over eight weeks" },
  { shot: "daily", alt: "A daily question as a card, with room to write and stamps" },
  { shot: "moments", alt: "Moments, newest first" },
] as const;

function Inside() {
  return (
    <section id="inside" className="relative border-t border-line/70">
      <Backdrop className="-left-64 top-[18%] w-[820px]" />
      <Backdrop className="-right-72 bottom-[8%] w-[760px]" turn />
      <Wrap className="relative">
        {/* On wide screens a screen of its own, so each step after it has the whole screen. */}
        <div data-stop="What ana holds" className="landing-snap-start min-h-[calc(100svh-65px)] flex flex-col items-center justify-center py-8 text-center max-w-[720px] mx-auto">
          <BrandMark size={72} className="mb-6" />
          <Eyebrow>
            What <Ana /> holds
          </Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(30px,4.2vw,52px)] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">Your practice, your reflections, your moments. In one quiet place.</h2>
          <ul className="mt-10 flex flex-wrap items-center justify-center gap-x-8 gap-y-4 lg:gap-10">
            {FEATURES.map((f) => (
              <li key={f.eyebrow} className="flex items-center gap-3">
                <SeenBadge k={f.badge} />
                <Eyebrow>{f.eyebrow}</Eyebrow>
              </li>
            ))}
          </ul>
        </div>
        <div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] lg:gap-20">
          <div className="flex flex-col">
            {FEATURES.map((f, i) => (
              <article key={f.eyebrow} data-step={f.step} data-stop={f.eyebrow} className="landing-snap-start min-h-[calc(100svh-65px)] flex flex-col justify-center pt-6 pb-16 lg:py-10">
                <div className="max-w-[520px] mx-auto lg:mx-0 text-center lg:text-left">
                  <div className="inline-flex items-center gap-3">
                    <SeenBadge k={f.badge} />
                    <Eyebrow>{f.eyebrow}</Eyebrow>
                  </div>
                  <h3 className="mt-4 sm:mt-5 font-display text-[clamp(26px,3.3vw,36px)] font-semibold leading-[1.15] tracking-[-0.015em] text-balance">{f.title}</h3>
                  <p className="hidden sm:block mt-4 font-serif text-[17.5px] leading-[1.65] text-ink-soft">{f.body}</p>
                  <ul className="hidden sm:flex mt-6 flex-col gap-2.5 text-left max-w-[420px] mx-auto lg:mx-0" {...(i === 0 ? { "data-step": 1 } : {})}>
                    {f.points.map((p) => (
                      <li key={p} className="flex items-start gap-3 font-ui text-[15px] text-ink">
                        <DoneMark size={20} className="text-accent shrink-0 mt-[1px]" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </div>
                {/* Phones: the headline, then the section's own screen (wider screens: the sticky phone). */}
                <div className="mt-7 sm:mt-10 flex justify-center lg:hidden">
                  <Phone shot={f.mobile.shot} alt={f.mobile.alt} className="w-[min(72vw,290px,calc((100svh-355px)*0.462))] sm:w-[min(60vw,270px,calc((100svh-605px)*0.462))]" />
                </div>
              </article>
            ))}
          </div>
          <div className="hidden lg:block">
            <StickyPhone steps={STEPS} />
          </div>
        </div>
      </Wrap>
    </section>
  );
}

/** One quiet moment in the page: just the line, and a yantra drawing itself beneath it, between two pillars. */
function Quiet() {
  return (
    <section aria-label="Just here and now" data-stop="Just here and now" className="landing-snap relative border-t border-line/70 flex items-center">
      {/* The same yantra, very large and faint, turning slowly behind. */}
      <Yantra draw={false} className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[min(150vw,1100px)] h-auto text-ink/[0.045] landing-turn" />
      <Wrap className="relative py-16 flex flex-col items-center text-center">
        <p className="font-display italic text-[clamp(40px,7vw,84px)] leading-[1.05] tracking-[-0.02em] text-ink">Just here and now</p>
        <PillarYantra className="mt-12 sm:mt-20" />
      </Wrap>
    </section>
  );
}

function Private() {
  const steps = [
    { glyph: "lock", title: "Sealed on your phone", body: "Every word, photo and recording is encrypted on your phone before it leaves it." },
    { glyph: "fingerprint", title: "Opened only by you", body: "Your passkey or your 12 recovery words open your logger. Nothing else can." },
    { glyph: "shield", title: "Unseen by anyone else", body: "Not the server, not the people who make ana. What you keep is for you." },
  ] as const;
  return (
    <section id="private" data-stop="Private" className="landing-snap flex items-center">
      <Wrap className="pt-3 pb-14 sm:py-8">
        <div className="relative overflow-hidden rounded-[28px] sm:rounded-[32px] bg-accent text-bg px-5 py-8 sm:px-12 sm:py-12">
          <Ornament name="kolam" width={340} className="pointer-events-none absolute -right-20 -bottom-24 text-bg/10" />
          <div className="relative max-w-[620px]">
            <h2 className="font-display text-[clamp(30px,4.2vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">Your logger is yours alone.</h2>
            <p className="mt-2 sm:mt-3 font-serif text-[17px] sm:text-[18px] leading-[1.55] text-bg/85">What you write in ana is between you and you.</p>
          </div>
          {/* What leaves your phone: your words, sealed. */}
          <div className="relative mt-5 sm:mt-7 rounded-[18px] sm:rounded-[22px] bg-bg/10 ring-1 ring-bg/15 p-4 sm:p-5 max-w-[640px]">
            <p className="font-ui text-[12px] font-semibold uppercase tracking-[0.1em] text-bg/70">What leaves your phone</p>
            <div className="mt-3">
              <SealedLine text="Sat by the river this morning. The mind was quiet." />
            </div>
          </div>
          <ul className="relative mt-5 sm:mt-7 grid sm:grid-cols-3 gap-2 sm:gap-4">
            {steps.map((s) => (
              <li key={s.title} className="flex items-center sm:items-start gap-3 sm:gap-4 rounded-[18px] sm:rounded-[22px] bg-bg/10 ring-1 ring-bg/15 p-3 sm:p-5">
                <span className="grid place-items-center w-9 h-9 sm:w-10 sm:h-10 shrink-0 rounded-[11px] sm:rounded-[12px] bg-bg/15">
                  <Glyph k={s.glyph} size={20} />
                </span>
                <div className="min-w-0">
                  <h3 className="font-ui text-[16px] font-semibold">{s.title}</h3>
                  <p className="hidden sm:block mt-1 font-ui text-[14px] leading-[1.5] text-bg/80">{s.body}</p>
                </div>
              </li>
            ))}
          </ul>
        </div>
      </Wrap>
    </section>
  );
}

function Anywhere() {
  const items = [
    { glyph: "offline", title: "Works without internet", body: "Everything is kept on your phone. What you add offline is sent when you're back." },
    { glyph: "phone", title: "Like an app on your phone", body: "Add ana to your home screen on iPhone or Android. It opens full screen, like any app." },
    { glyph: "sunrise", title: "Light and dark", body: "A calm page by day, a quiet one at night. Your choice, kept on every device." },
  ] as const;
  return (
    <section data-stop="With you anywhere" className="landing-snap relative flex items-center border-y border-line/70 bg-surface/40">
      <Backdrop className="left-1/2 -translate-x-1/2 -top-56 w-[900px]" />
      <Wrap className="relative pt-8 pb-16 sm:py-14">
        <div className="text-center max-w-[600px] mx-auto flex flex-col items-center">
          <BrandMark size={72} className="mb-4 sm:mb-6" />
          <Eyebrow>With you anywhere</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(28px,3.8vw,40px)] font-semibold leading-[1.12] tracking-[-0.02em] text-balance">On the mat, on the road, in the ashram.</h2>
        </div>
        <ul className="mt-8 sm:mt-12 grid sm:grid-cols-3 gap-3 sm:gap-5">
          {items.map((it) => (
            <li key={it.title} className="flex items-center gap-4 sm:block rounded-[18px] sm:rounded-[22px] bg-bg border border-line/70 p-4 sm:p-6">
              <span className="grid place-items-center w-11 h-11 shrink-0 rounded-[13px] bg-accent-soft text-accent">
                <Glyph k={it.glyph} size={22} />
              </span>
              <h3 className="sm:mt-4 font-ui text-[16.5px] font-semibold text-ink">{it.title}</h3>
              <p className="hidden sm:block mt-1.5 font-ui text-[14.5px] leading-[1.55] text-ink-soft">{it.body}</p>
            </li>
          ))}
        </ul>
      </Wrap>
    </section>
  );
}

function Begin() {
  return (
    <section id="begin" data-stop="Begin" className="landing-snap relative flex items-center">
      <Backdrop className="-left-56 -bottom-40 w-[700px]" turn />
      <Wrap className="relative pt-5 pb-14 sm:py-14 grid lg:grid-cols-[1fr_1.1fr] gap-8 sm:gap-12 lg:gap-16 items-center">
        <div className="text-center lg:text-left">
          <Eyebrow>Begin</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(30px,4.2vw,44px)] font-semibold leading-[1.1] tracking-[-0.02em] text-balance">Three small steps.</h2>
          <p className="mt-4 font-serif text-[18px] leading-[1.6] text-ink-soft max-w-[40ch] mx-auto lg:mx-0">Sign in, and your logger is opened for you. Then keep it on your home screen.</p>
          <BeginButton className="mt-6 sm:mt-8 w-full sm:w-auto" />
        </div>
        <ol className="flex flex-col gap-3 sm:gap-4">
          {[
            { n: "1", title: "Sign in with Google", body: "Use the Google account you'd like your logger under." },
            { n: "2", title: "Your access is opened", body: "Once you're let in, you set up your private key: your passkey, and 12 recovery words to keep safe." },
            { n: "3", title: "Put ana on your home screen", body: null },
          ].map((s) => (
            <li key={s.n} className="flex items-center sm:items-start gap-4 rounded-[18px] sm:rounded-[22px] bg-surface p-4 sm:p-6">
              <span className="grid place-items-center w-10 h-10 shrink-0 rounded-full bg-accent text-bg font-display text-[18px] font-semibold">{s.n}</span>
              <div className="min-w-0 flex-1">
                <h3 className="font-ui text-[16.5px] font-semibold text-ink">{s.title}</h3>
                {s.body ? (
                  <p className="hidden sm:block mt-1 font-ui text-[14.5px] leading-[1.55] text-ink-soft">{s.body}</p>
                ) : (
                  <>
                  <p className="sm:hidden mt-1 font-ui text-[13.5px] leading-[1.5] text-ink-soft">iPhone: Safari, Share, Add to Home Screen. Android: Chrome, ⋮, Install app.</p>
                  <div className="hidden sm:grid mt-3 sm:grid-cols-2 gap-3">
                    <Install os="iPhone" steps={["Open ana in Safari", "Tap Share", "Choose Add to Home Screen"]} />
                    <Install os="Android" steps={["Open ana in Chrome", "Tap the ⋮ menu", "Choose Install app"]} />
                  </div>
                  </>
                )}
              </div>
            </li>
          ))}
        </ol>
      </Wrap>
    </section>
  );
}

function Install({ os, steps }: { os: string; steps: string[] }) {
  return (
    <div className="rounded-[16px] bg-bg/80 border border-line/70 p-4">
      <p className="font-ui text-[13px] font-semibold text-accent">{os}</p>
      <ol className="mt-2 flex flex-col gap-1.5">
        {steps.map((s, i) => (
          <li key={s} className="flex gap-2 font-ui text-[14px] text-ink">
            <span className="text-ink-soft tabular">{i + 1}.</span>
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}

function Questions() {
  const faq = [
    { q: "Who can see my logger?", a: "Only you. It's encrypted on your phone before it leaves it, and only your passkey or recovery words can open it. Not even the people who run ana can read it." },
    { q: "What if I lose my phone?", a: "Sign in on your new phone and open your logger with your passkey or your 12 recovery words. Everything is there. Keep the words somewhere safe: without them and your passkey, no one can open the logger, not even us." },
    { q: "Does it work without internet?", a: "Yes. Everything is kept on your phone, so ana opens and works offline. What you add is sent as soon as you're back online." },
  ];
  return (
    <section data-stop="Questions" className="landing-snap-start relative border-t border-line/70">
      <Backdrop className="-right-48 top-40 w-[620px]" />
      <Wrap className="relative py-20 sm:py-24 max-w-[760px]">
        <div className="text-center">
          <Eyebrow>Questions</Eyebrow>
          <h2 className="mt-4 font-display text-[clamp(28px,3.8vw,40px)] font-semibold leading-[1.12] tracking-[-0.02em]">A few things people ask</h2>
        </div>
        <div className="mt-10 flex flex-col gap-3">
          {faq.map((f) => (
            <details key={f.q} className="group rounded-[20px] bg-surface px-5 sm:px-6 open:pb-5">
              <summary className="flex items-center justify-between gap-4 py-5 cursor-pointer list-none font-ui text-[16px] font-semibold text-ink [&::-webkit-details-marker]:hidden">
                {f.q}
                <span aria-hidden="true" className="grid place-items-center w-8 h-8 shrink-0 rounded-full bg-bg text-accent transition-transform duration-300 group-open:rotate-45 text-[20px] leading-none">+</span>
              </summary>
              <p className="font-serif text-[16.5px] leading-[1.65] text-ink-soft">{f.a}</p>
            </details>
          ))}
        </div>
      </Wrap>
    </section>
  );
}

function Footer() {
  return (
    <footer className="landing-snap-end border-t border-line/70">
      <Wrap className="py-12 flex flex-col sm:flex-row items-center justify-between gap-6 text-center sm:text-left">
        <div>
          <div className="flex items-center justify-center sm:justify-start gap-2 text-accent">
            <BrandMark size={26} />
            <span className="font-display text-[22px] font-semibold text-ink leading-none">ana</span>
          </div>
          <p className="mt-1 sm:pl-[34px] font-serif italic text-[15px] text-ink-soft">Just here and now</p>
        </div>
        <nav aria-label="Footer" className="flex items-center gap-1">
          <Link href="/login" className="inline-flex h-10 items-center px-3 rounded-full font-ui text-[14px] font-semibold text-ink hover:bg-surface">Sign in</Link>
          <Link href="/terms" className="inline-flex h-10 items-center px-3 rounded-full font-ui text-[14px] font-medium text-ink-soft hover:text-ink">Terms</Link>
          <Link href="/privacy" className="inline-flex h-10 items-center px-3 rounded-full font-ui text-[14px] font-medium text-ink-soft hover:text-ink">Privacy</Link>
        </nav>
      </Wrap>
    </footer>
  );
}
