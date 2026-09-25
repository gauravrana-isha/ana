"use client";

import { BusyBar } from "@/components/ui/Busy";

import { useMemo, useState } from "react";
import Image from "next/image";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Check } from "@phosphor-icons/react";
import { Chevron } from "@/components/ui/Arrows";
import { Lotus } from "@/components/art/Lotus";
import { Ornament } from "@/components/art/Ornament";
import { Button } from "@/components/ui/Button";
import { FeatureBadge } from "@/components/art/FeatureBadge";
import { STARTER_IDS } from "@/lib/practiceCatalog";
import { FEATURES, type FeatureKey } from "@/lib/features";
import { PracticeLibrary } from "@/components/tracker/PracticeLibrary";
import { cn } from "@/lib/utils";

type Step = "welcome" | "you" | "sections" | "practices";

interface Props {
  user: { name: string; email: string; image: string | null };
  allowed: FeatureKey[];
}

export function OnboardingJourney({ user, allowed }: Props) {
  const reduce = useReducedMotion();
  const [step, setStep] = useState<Step>("welcome");
  const [direction, setDirection] = useState(1);

  const [name, setName] = useState(user.name);
  const [intention, setIntention] = useState("");
  const [features, setFeatures] = useState<FeatureKey[]>(allowed);
  const [practices, setPractices] = useState<string[]>(STARTER_IDS);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const steps = useMemo<Step[]>(() => {
    const s: Step[] = ["welcome", "you", "sections"];
    if (features.includes("tracker")) s.push("practices");
    return s;
  }, [features]);

  const index = steps.indexOf(step);
  const isLast = index === steps.length - 1;

  function go(to: Step) {
    setDirection(steps.indexOf(to) > index ? 1 : -1);
    setError("");
    setStep(to);
  }

  async function finish() {
    setSaving(true);
    setError("");
    try {
      const res = await fetch("/api/onboard", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          intention: intention.trim() || undefined,
          features,
          catalogIds: features.includes("tracker") ? practices : [],
        }),
      });
      if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't save");
      window.location.replace("/");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Couldn't save. Please try again.");
      setSaving(false);
    }
  }

  function next() {
    if (isLast) finish();
    else go(steps[index + 1]);
  }

  const canContinue =
    (step === "you" && name.trim().length > 0) ||
    (step === "sections" && features.length > 0) ||
    (step === "practices" && practices.length > 0) ||
    step === "welcome";

  const variants = {
    enter: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * 28 }),
    center: { opacity: 1, x: 0 },
    exit: (d: number) => ({ opacity: 0, x: reduce ? 0 : d * -28 }),
  };

  return (
    <div className="min-h-dvh flex flex-col">
      {/* Progress */}
      <header className="sticky top-0 z-10 bg-bg/90 backdrop-blur-md pt-[max(14px,env(safe-area-inset-top))]" inert={saving}>
        <BusyBar show={saving} className="absolute bottom-0 inset-x-0" />
        <div className="max-w-[560px] mx-auto px-5 h-14 flex items-center gap-3">
          <button
            type="button"
            onClick={() => go(steps[index - 1])}
            aria-label="Back"
            className={cn(
              "press grid place-items-center w-9 h-9 -ml-2 rounded-full text-ink hover:bg-surface",
              index === 0 && "invisible"
            )}
          >
            <Chevron dir="left" size={18} />
          </button>
          <div className="flex-1 flex gap-1.5" aria-label={`Step ${index + 1} of ${steps.length}`}>
            {steps.map((s, i) => (
              <span key={s} className="h-1 flex-1 rounded-full bg-line overflow-hidden">
                <motion.span
                  className="block h-full bg-accent rounded-full"
                  initial={false}
                  animate={{ width: i <= index ? "100%" : "0%" }}
                  transition={{ duration: 0.45, ease: [0.16, 1, 0.3, 1] }}
                />
              </span>
            ))}
          </div>
          <span className="font-ui text-[12px] font-medium text-ink-soft tabular w-9 text-right">
            {index + 1}/{steps.length}
          </span>
        </div>
      </header>

      <main inert={saving} aria-busy={saving || undefined} className={cn("flex-1 md:flex-none w-full max-w-[560px] mx-auto px-5 pt-4 pb-36 md:pb-6 overflow-x-clip transition-opacity duration-200", saving && "opacity-60")}>
        <AnimatePresence mode="wait" custom={direction} initial={false}>
          <motion.section
            key={step}
            custom={direction}
            variants={variants}
            initial="enter"
            animate="center"
            exit="exit"
            transition={{ duration: 0.32, ease: [0.16, 1, 0.3, 1] }}
          >
            {step === "welcome" && <Welcome firstName={name.split(" ")[0]} />}

            {step === "you" && (
              <div>
                <StepTitle title="How should we call you?" lead="This is how you'll appear to admins. You can change it later." />
                <label className="block mt-8">
                  <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
                  <input
                    value={name}
                    onChange={(e) => setName(e.target.value.slice(0, 80))}
                    autoComplete="name"
                    className="mt-2 w-full h-12 px-4 rounded-[14px] bg-surface text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent transition-colors"
                  />
                </label>
                <label className="block mt-6">
                  <span className="font-ui text-[13px] font-semibold text-ink">
                    What brings you to ana? <span className="font-normal text-ink-soft">(optional)</span>
                  </span>
                  <textarea
                    value={intention}
                    onChange={(e) => setIntention(e.target.value.slice(0, 500))}
                    rows={4}
                    placeholder="A line or two helps the admin welcome you, e.g. “I volunteer at the Ashram and want to keep my sadhana steady.”"
                    className="mt-2 w-full px-4 py-3 rounded-[14px] bg-surface text-ink font-ui text-[16px] leading-[1.55] outline-none border border-transparent focus:border-accent resize-none placeholder:text-ink-soft/80 transition-colors"
                  />
                  <span className="block mt-1.5 text-right font-ui text-[12px] text-ink-soft tabular">
                    {intention.length}/500
                  </span>
                </label>
              </div>
            )}

            {step === "sections" && (
              <div>
                <StepTitle title="What would you like to use?" lead="Choose the parts of ana you want. You can turn them on or off in Settings." />
                <div className="mt-7 flex flex-col gap-2">
                  {FEATURES.map((f) => {
                    const available = allowed.includes(f.key);
                    const on = features.includes(f.key);
                    return (
                      <button
                        key={f.key}
                        type="button"
                        disabled={!available}
                        aria-pressed={on}
                        onClick={() =>
                          setFeatures((cur) => (on ? cur.filter((k) => k !== f.key) : [...cur, f.key]))
                        }
                        className={cn(
                          "press flex items-center gap-4 p-4 rounded-[16px] text-left border transition-colors",
                          on ? "bg-accent-soft border-accent/40" : "bg-surface border-transparent hover:bg-surface-2",
                          !available && "opacity-50"
                        )}
                      >
                        <FeatureBadge k={f.key} size={44} />
                        <span className="flex-1 min-w-0">
                          <span className="block font-ui text-[15px] font-semibold text-ink">{f.label}</span>
                          <span className="block font-ui text-[13.5px] leading-[1.45] text-ink-soft mt-0.5">
                            {available ? f.description : "Not available on your account yet."}
                          </span>
                        </span>
                        <Tick on={on} />
                      </button>
                    );
                  })}
                </div>
              </div>
            )}


            {step === "practices" && (
              <div>
                <StepTitle
                  title="Your practices"
                  lead={`${practices.length} chosen. Pick what you'd like to track each day; you can add or create more any time.`}
                />
                <PracticeLibrary
                  mode="select"
                  className="mt-6"
                  chosen={new Set(practices)}
                  onToggle={(entry) =>
                    setPractices((cur) => (cur.includes(entry.id) ? cur.filter((x) => x !== entry.id) : [...cur, entry.id]))
                  }
                />
              </div>
            )}
          </motion.section>
        </AnimatePresence>
      </main>

      {/* Action */}
      <footer className="fixed md:static bottom-0 inset-x-0 z-10 bg-bg border-t border-line md:border-0 pt-4 md:pt-2 pb-[max(20px,env(safe-area-inset-bottom))] md:pb-16">
        <div className="max-w-[560px] mx-auto px-5">
          {error && (
            <p role="alert" className="mb-3 font-ui text-[13px] text-danger text-center">
              {error}
            </p>
          )}
          <Button size="lg" className="w-full" onClick={next} disabled={!canContinue} loading={saving}>
            {step === "welcome" ? "Begin" : isLast ? "Finish" : "Continue"}
          </Button>
        </div>
      </footer>
    </div>
  );
}

function Welcome({ firstName }: { firstName: string }) {
  return (
    <div>
      <div className="relative aspect-[16/10] rounded-[22px] overflow-hidden bg-surface">
        <Image src="/images/sadhguru-namaskar.jpg" alt="Sadhguru with hands folded in namaskar" fill priority sizes="(min-width: 600px) 560px, 100vw" className="object-cover object-[50%_22%]" />
      </div>
      <div className="mt-8 flex items-center gap-2 text-accent">
        <Lotus size={26} />
        <span className="font-display text-[20px] font-semibold text-ink">ana</span>
      </div>
      <h1 className="mt-4 font-display text-[34px] font-semibold tracking-[-0.02em] leading-[1.1] text-ink">
        {firstName ? `Welcome, ${firstName}.` : "Welcome."}
      </h1>
      <Ornament name="flourish" width={140} className="mt-4 text-ink-soft/45" />
      <p className="mt-4 font-ui text-[16px] leading-[1.65] text-ink-soft">
        ana is a quiet place for your sadhana: the practices you keep, a few words at the end of each day and
        week, and the moments and people you don&rsquo;t want to forget.
      </p>
      <p className="mt-3 font-ui text-[16px] leading-[1.65] text-ink-soft">
        No streaks, no scores. Just a journal that remembers.
      </p>
    </div>
  );
}

function StepTitle({ title, lead }: { title: string; lead: string }) {
  return (
    <>
      <h1 className="mt-4 font-display text-[30px] font-semibold tracking-[-0.02em] leading-[1.15] text-ink">{title}</h1>
      <p className="mt-3 font-ui text-[15.5px] leading-[1.6] text-ink-soft">{lead}</p>
    </>
  );
}

function Tick({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "grid place-items-center w-6 h-6 rounded-full shrink-0 transition-all duration-200",
        on ? "bg-accent text-bg scale-100" : "border-[1.5px] border-line bg-bg scale-95"
      )}
    >
      {on && <Check size={13} weight="bold" />}
    </span>
  );
}
