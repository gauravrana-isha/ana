"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { BrandMark } from "@/components/art/BrandMark";
import { cn } from "@/lib/utils";

/**
 * The full-screen frame for locking and unlocking the journal: the ana mark, one calm
 * column, a step that slides in, and the main action pinned at the bottom on phones.
 */
export function VaultScreen({
  step,
  children,
  footer,
  top,
}: {
  step: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
  top?: React.ReactNode;
}) {
  const reduce = useReducedMotion();
  return (
    <div className="min-h-dvh flex flex-col bg-bg">
      <header className="pt-[max(18px,var(--safe-top))]">
        <div className="max-w-[520px] mx-auto px-5 h-12 flex items-center justify-between">
          <span className="flex items-center gap-1.5 text-accent">
            <BrandMark size={24} />
            <span className="font-display text-[19px] font-semibold text-ink leading-none">ana</span>
          </span>
          {top}
        </div>
      </header>
      <main className="flex-1 w-full max-w-[520px] mx-auto px-5 pt-6 pb-40 md:pb-8 overflow-x-clip">
        <AnimatePresence mode="wait" initial={false}>
          <motion.section
            key={step}
            initial={{ opacity: 0, y: reduce ? 0 : 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: reduce ? 0 : -6 }}
            transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
          >
            {children}
          </motion.section>
        </AnimatePresence>
      </main>
      {footer && <ScreenFooter>{footer}</ScreenFooter>}
    </div>
  );
}

/**
 * The main action of a full-screen step (setting up, unlocking, first steps): pinned to the
 * bottom on phones, under the content on wider screens. The one such bar, wherever it's used.
 */
export function ScreenFooter({ children, width = "max-w-[520px]" }: { children: React.ReactNode; width?: string }) {
  return (
    <footer className="fixed md:static bottom-0 inset-x-0 z-10 bg-bg/95 backdrop-blur-md border-t border-line md:border-0 pt-4 pb-[max(20px,env(safe-area-inset-bottom))] md:pb-16">
      <div className={cn(width, "mx-auto px-5 flex flex-col gap-2")}>{children}</div>
    </footer>
  );
}

export function ScreenTitle({ title, lead, className }: { title: string; lead?: React.ReactNode; className?: string }) {
  return (
    <div className={className}>
      <h1 className="font-display text-[30px] sm:text-[32px] font-semibold tracking-[-0.02em] leading-[1.15] text-ink text-balance">{title}</h1>
      {lead && <p className="mt-3 font-ui text-[15.5px] leading-[1.6] text-ink-soft text-pretty">{lead}</p>}
    </div>
  );
}

/** A choice card: icon, title, one line, and an optional tag ("Recommended"). */
export function ChoiceCard({
  icon,
  title,
  line,
  tag,
  onClick,
  busy,
  className,
}: {
  icon: React.ReactNode;
  title: string;
  line: string;
  tag?: string;
  onClick: () => void;
  busy?: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-busy={busy || undefined}
      className={cn(
        "press w-full flex items-center gap-4 p-4 rounded-[18px] text-left bg-surface hover:bg-surface-2 border border-transparent transition-colors disabled:opacity-70",
        className
      )}
    >
      <span className="grid place-items-center w-11 h-11 rounded-[13px] bg-accent-soft text-accent shrink-0">{icon}</span>
      <span className="flex-1 min-w-0">
        <span className="flex items-center gap-2">
          <span className="font-ui text-[15px] font-semibold text-ink">{title}</span>
          {tag && <span className="h-5 px-2 grid place-items-center rounded-full bg-accent text-bg font-ui text-[10.5px] font-semibold tracking-wide uppercase">{tag}</span>}
        </span>
        <span className="block font-ui text-[13.5px] leading-[1.45] text-ink-soft mt-0.5">{line}</span>
      </span>
      {busy ? (
        <span className="w-5 h-5 rounded-full border-2 border-accent/30 border-t-accent animate-spin shrink-0" />
      ) : (
        <svg width="16" height="16" viewBox="0 0 24 24" aria-hidden="true" className="text-ink-soft shrink-0">
          <path d="M9 5l7 7-7 7" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      )}
    </button>
  );
}

export function FieldError({ children }: { children?: React.ReactNode }) {
  if (!children) return null;
  return (
    <p role="alert" className="font-ui text-[13.5px] leading-[1.5] text-danger">
      {children}
    </p>
  );
}
