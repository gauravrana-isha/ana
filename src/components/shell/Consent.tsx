"use client";

import { createContext, useContext, useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { WebAnalytics } from "./WebAnalytics";
import { cn } from "@/lib/utils";

/*
 * Cookies, asked once. ana only needs the cookies that make it work (signing in, light or
 * dark), and those need no asking. The one thing a yes adds is counting visits, anonymously
 * (Vercel Web Analytics: no cookies of its own, nothing personal). The answer is kept in the
 * `ana-consent` cookie for a year, and can be changed any time (ConsentLink).
 */

export type ConsentChoice = "yes" | "no";
export const CONSENT_COOKIE = "ana-consent";
const OPEN_EVENT = "ana:consent";

const Ctx = createContext<{ choice?: ConsentChoice; choose: (c: ConsentChoice) => void }>({ choose: () => {} });

export function useConsent() {
  return useContext(Ctx);
}

export function ConsentProvider({ initial, children }: { initial?: ConsentChoice; children: React.ReactNode }) {
  const [choice, setChoice] = useState<ConsentChoice | undefined>(initial);
  const [asking, setAsking] = useState(!initial);
  useEffect(() => {
    const open = () => setAsking(true);
    window.addEventListener(OPEN_EVENT, open);
    return () => window.removeEventListener(OPEN_EVENT, open);
  }, []);
  const choose = (c: ConsentChoice) => {
    const secure = location.protocol === "https:" ? "; secure" : "";
    document.cookie = `${CONSENT_COOKIE}=${c}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax${secure}`;
    setChoice(c);
    setAsking(false);
  };
  return (
    <Ctx.Provider value={{ choice, choose }}>
      {children}
      {choice === "yes" && <WebAnalytics />}
      <ConsentBar open={asking} choice={choice} onChoose={choose} />
    </Ctx.Provider>
  );
}

function ConsentBar({ open, choice, onChoose }: { open: boolean; choice?: ConsentChoice; onChoose: (c: ConsentChoice) => void }) {
  const reduce = useReducedMotion();
  return (
    <AnimatePresence>
      {open && (
        <motion.section
          aria-label="Cookies"
          className="ana-consent fixed z-[95] inset-x-3 sm:inset-x-auto sm:left-5 sm:max-w-[340px] rounded-[22px] bg-bg border border-line shadow-[var(--shadow-lift)] p-4 sm:p-5"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: 24 }}
          transition={{ type: "spring", stiffness: 380, damping: 34 }}
        >
          <h2 className="font-display text-[18px] font-semibold text-ink">Cookies</h2>
          <p className="mt-1.5 font-ui text-[14px] leading-[1.55] text-ink-soft">
            ana uses only the cookies it needs to work. With your yes, it also counts visits, anonymously, to see what helps.{" "}
            <Link href="/privacy#s5" className="font-semibold text-accent underline underline-offset-2">
              More
            </Link>
          </p>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={() => onChoose("no")} aria-pressed={choice === "no"} className="press flex-1 h-11 rounded-full bg-surface border border-line font-ui text-[15px] font-semibold text-ink hover:bg-surface-2">
              No
            </button>
            <button type="button" onClick={() => onChoose("yes")} aria-pressed={choice === "yes"} className="press flex-1 h-11 rounded-full bg-accent font-ui text-[15px] font-semibold text-bg hover:brightness-110">
              Yes
            </button>
          </div>
        </motion.section>
      )}
    </AnimatePresence>
  );
}

/** "Cookies: Yes/No": opens the question again, to change the answer. */
export function ConsentLink({ className }: { className?: string }) {
  const { choice } = useConsent();
  return (
    <button type="button" onClick={() => window.dispatchEvent(new Event(OPEN_EVENT))} className={cn("press", className)}>
      Cookies{choice ? `: ${choice === "yes" ? "Yes" : "No"}` : ""}
    </button>
  );
}
