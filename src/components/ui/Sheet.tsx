"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { cn } from "@/lib/utils";
import { BusyBar } from "./Busy";
import { CloseButton } from "@/components/ui/CloseButton";
import { Portal } from "./Portal";
import { useVisibleArea } from "@/lib/visual-viewport";

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
  const area = useVisibleArea(open);
  const bodyRef = useRef<HTMLDivElement>(null);

  // Keep what you're typing in view. With the keyboard up the sheet is short, and iOS doesn't
  // always scroll the sheet's own body to the field or the cursor, so it could sit hidden
  // behind the footer. On focus, typing and keyboard resizes, scroll it into the visible part.
  useEffect(() => {
    if (!open) return;
    let frame = 0;
    const keep = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const body = bodyRef.current;
        const el = document.activeElement as HTMLElement | null;
        if (!body || !el || !body.contains(el)) return;
        let target = el.getBoundingClientRect();
        // In rich text, follow the cursor itself rather than the whole editor.
        const sel = document.getSelection();
        if (el.isContentEditable && sel?.rangeCount) {
          const r = sel.getRangeAt(0).getBoundingClientRect();
          if (r.height || r.top) target = r;
        }
        const box = body.getBoundingClientRect();
        // A field with suggestions below it (the people picker) asks for that room too.
        const wants = el.closest<HTMLElement>("[data-keep-room]");
        if (wants) {
          const r = wants.getBoundingClientRect();
          const room = Math.min(Number(wants.dataset.keepRoom) || 0, Math.max(0, box.height - r.height - 28));
          target = new DOMRect(r.left, r.top, r.width, r.height + room);
        }
        if (target.height > box.height - 28) {
          // Taller than the space (a long note): bring its top into view; the cursor is near.
          if (target.top < box.top || target.top > box.bottom - 40) body.scrollTop += target.top - box.top - 12;
        } else if (target.bottom > box.bottom - 16) {
          body.scrollTop += target.bottom - box.bottom + 16;
        } else if (target.top < box.top + 12) {
          body.scrollTop -= box.top + 12 - target.top;
        }
      });
    };
    const late = () => setTimeout(keep, 280); // after the keyboard finishes sliding in
    document.addEventListener("focusin", late);
    document.addEventListener("selectionchange", keep);
    window.visualViewport?.addEventListener("resize", keep);
    return () => {
      cancelAnimationFrame(frame);
      document.removeEventListener("focusin", late);
      document.removeEventListener("selectionchange", keep);
      window.visualViewport?.removeEventListener("resize", keep);
    };
  }, [open]);

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
    <Portal>
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" style={area} role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div
            className={cn(
              "relative w-full max-h-[94%] sm:max-h-[88%] flex flex-col bg-bg rounded-t-[24px] sm:rounded-[24px] shadow-[var(--shadow-lift)] overflow-hidden",
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
                <CloseButton onClick={onClose} disabled={busy} />
              </div>
              <div inert={busy}>{header}</div>
            </header>
            <div ref={bodyRef} inert={busy} aria-busy={busy || undefined} className={cn("flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-4 pb-6 transition-opacity duration-200", busy && "opacity-60 select-none")}>
              {children}
            </div>
            {footer && (
              <footer className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-line bg-bg">{footer}</footer>
            )}
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
