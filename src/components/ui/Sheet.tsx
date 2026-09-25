"use client";

import { useEffect } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { X } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";
import { BusyBar } from "./Busy";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Sticky footer (e.g. the Save button). */
  footer?: React.ReactNode;
  /** Extra header content under the title (tabs). */
  header?: React.ReactNode;
  size?: "md" | "lg";
  /** Saving: fields lock, a bar runs along the top, closing is blocked. */
  busy?: boolean;
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, header, size = "md", busy = false }: SheetProps) {
  const reduce = useReducedMotion();

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div
            className={cn(
              "relative w-full max-h-[94dvh] sm:max-h-[88dvh] flex flex-col bg-bg rounded-t-[24px] sm:rounded-[24px] shadow-[var(--shadow-lift)] overflow-hidden",
              size === "lg" ? "sm:max-w-[680px]" : "sm:max-w-[560px]"
            )}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <BusyBar show={busy} className="absolute top-0 inset-x-6 z-10" />
            <span className="sm:hidden mx-auto mt-2.5 w-10 h-1 rounded-full bg-line shrink-0" aria-hidden="true" />
            <header className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-6">
              <div className="flex items-center justify-between gap-3">
                <h2 className="font-display text-[24px] font-semibold tracking-[-0.015em] text-ink">{title}</h2>
                <button type="button" onClick={onClose} disabled={busy} aria-label="Close" className="press disabled:opacity-40 grid place-items-center w-9 h-9 rounded-full bg-surface text-ink-soft hover:text-ink">
                  <X size={16} />
                </button>
              </div>
              <div inert={busy}>{header}</div>
            </header>
            <div inert={busy} aria-busy={busy || undefined} className={cn("flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-4 pb-6 transition-opacity duration-200", busy && "opacity-60 select-none")}>
              {children}
            </div>
            {footer && (
              <footer className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-line bg-bg">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}
