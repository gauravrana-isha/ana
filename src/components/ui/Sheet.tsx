"use client";

import { createContext, useContext, useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion, useDragControls, useReducedMotion, type PanInfo } from "framer-motion";
import { cn } from "@/lib/utils";
import { BusyBar } from "./Busy";
import { CloseButton } from "@/components/ui/CloseButton";
import { Portal } from "./Portal";
import { useVisibleArea } from "@/lib/visual-viewport";
import { lockScroll } from "@/lib/scroll-lock";

interface SheetProps {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
  /** Sticky footer (e.g. the Save button). */
  footer?: React.ReactNode;
  /** Extra header content under the title (tabs). */
  header?: React.ReactNode;
  /** Beside the title, before the close button (e.g. "Mark all read"). */
  action?: React.ReactNode;
  /** sm: a small dialog on wider screens (pickers); lg: a wide one. */
  size?: "sm" | "md" | "lg";
  /** A fixed, tall height (lists that change length as you use them). */
  tall?: boolean;
  /** Saving: fields lock, a bar runs along the top, closing is blocked. */
  busy?: boolean;
}

/** The sheets open now, oldest first (the last is on top). */
const openSheets: string[] = [];

/** The open sheet's footer, for actions placed from inside its body (see SheetActions). */
const FooterSlot = createContext<HTMLElement | null>(null);

/**
 * A sheet's actions, from anywhere in its body: they go to the sheet's footer, the one bar at
 * the bottom every sheet shares. (A submit button there needs form="…", being outside the form.)
 * Outside a sheet they sit in a row under the content.
 */
export function SheetActions({ children }: { children: React.ReactNode }) {
  const slot = useContext(FooterSlot);
  const row = <div className="flex justify-end gap-3">{children}</div>;
  return slot ? createPortal(row, slot) : <div className="mt-6">{row}</div>;
}

/** Bottom sheet on phones, centred dialog on larger screens. */
export function Sheet({ open, onClose, title, children, footer, header, action, size = "md", tall = false, busy = false }: SheetProps) {
  const reduce = useReducedMotion();
  const area = useVisibleArea(open);
  const bodyRef = useRef<HTMLDivElement>(null);
  const drag = useDragControls();
  const id = useId();
  const [slot, setSlot] = useState<HTMLElement | null>(null);

  // Phones: pull the sheet down by its handle or title to close it; a short pull springs back.
  const startDrag = (e: React.PointerEvent) => {
    if (busy || e.pointerType === "mouse" || (e.target as Element).closest("button, a, input, [role=tab]")) return;
    drag.start(e);
  };
  const endDrag = (_: unknown, info: PanInfo) => {
    if (info.offset.y > 110 || info.velocity.y > 600) onClose();
  };

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

  // Escape closes the sheet on top only (a practice's editor, not the list under it too).
  // Its place in the pile is kept for as long as it's open, whatever re-renders.
  useEffect(() => {
    if (!open) return;
    openSheets.push(id);
    return () => void openSheets.splice(openSheets.lastIndexOf(id), 1);
  }, [open, id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && !busy && openSheets[openSheets.length - 1] === id && onClose();
    const unlock = lockScroll();
    window.addEventListener("keydown", onKey);
    return () => {
      unlock();
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, busy, id]);

  return (
    <Portal>
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" style={area} role="dialog" aria-modal="true" aria-label={title}>
          <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => !busy && onClose()} />
          <motion.div
            className={cn(
              "relative w-full max-h-[94%] sm:max-h-[88%] flex flex-col bg-bg rounded-t-[24px] sm:rounded-[24px] shadow-[var(--shadow-lift)] overflow-hidden",
              size === "lg" ? "sm:max-w-[680px]" : size === "sm" ? "sm:max-w-[380px]" : "sm:max-w-[560px]",
              tall && "h-[92%] sm:h-[min(820px,88%)]"
            )}
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
            drag="y"
            dragListener={false}
            dragControls={drag}
            dragConstraints={{ top: 0, bottom: 0 }}
            dragElastic={{ top: 0, bottom: 0.9 }}
            onDragEnd={endDrag}
          >
            <BusyBar show={busy} className="absolute top-0 inset-x-6 z-10" />
            <div onPointerDown={startDrag} className="sm:hidden shrink-0 pt-2.5 pb-1 -mb-1 touch-none" aria-hidden="true">
              <span className="block mx-auto w-10 h-1 rounded-full bg-line" />
            </div>
            <header onPointerDown={startDrag} className="shrink-0 px-5 sm:px-6 pt-4 sm:pt-6 max-sm:touch-none">
              <div className="flex items-center justify-between gap-3">
                <h2 className={cn("flex-1 font-display font-semibold tracking-[-0.015em] text-ink", size === "sm" ? "text-[20px]" : "text-[24px]")}>{title}</h2>
                {action}
                <CloseButton onClick={onClose} disabled={busy} size={size === "sm" ? "sm" : undefined} />
              </div>
              <div inert={busy}>{header}</div>
            </header>
            <div ref={bodyRef} inert={busy} aria-busy={busy || undefined} className={cn("flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-4 pb-6 transition-opacity duration-200", busy && "opacity-60 select-none")}>
              <FooterSlot.Provider value={slot}>{children}</FooterSlot.Provider>
            </div>
            {/* The one bar of actions at the bottom (hidden while there's nothing in it). */}
            <footer ref={setSlot} className="shrink-0 px-5 sm:px-6 pt-3 pb-[max(16px,env(safe-area-inset-bottom))] border-t border-line bg-bg empty:hidden">
              {footer}
            </footer>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
    </Portal>
  );
}
