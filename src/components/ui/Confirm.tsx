"use client";

import { createContext, useCallback, useContext, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Button } from "./Button";
import { Portal } from "./Portal";
import { DeleteMark } from "@/components/art/PenMarks";
import { cn } from "@/lib/utils";

/*
 * The app's own "are you sure?": a small card that rises from the bottom on phones and sits
 * in the middle on larger screens. `await ask({...})` (from `useConfirm()`) resolves true or false.
 * Escape, a tap outside or Cancel all mean no; for anything destructive, Cancel has focus.
 */

export interface ConfirmOptions {
  title: string;
  body?: React.ReactNode;
  confirmLabel?: string;
  cancelLabel?: string;
  /** "danger" for deleting or removing; the default is a calm primary action. */
  tone?: "danger" | "primary";
}

type Ask = (o: ConfirmOptions) => Promise<boolean>;
const Ctx = createContext<Ask>(async (o) => window.confirm(o.title));

export function useConfirm() {
  return useContext(Ctx);
}

export function ConfirmProvider({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState<(ConfirmOptions & { resolve: (v: boolean) => void }) | null>(null);
  const ask = useCallback<Ask>((o) => new Promise((resolve) => setOpen({ ...o, resolve })), []);
  const answer = useCallback(
    (v: boolean) => {
      open?.resolve(v);
      setOpen(null);
    },
    [open]
  );
  return (
    <Ctx.Provider value={ask}>
      {children}
      <ConfirmCard state={open} onAnswer={answer} />
    </Ctx.Provider>
  );
}

function ConfirmCard({ state, onAnswer }: { state: ConfirmOptions | null; onAnswer: (v: boolean) => void }) {
  const reduce = useReducedMotion();
  const cancelRef = useRef<HTMLButtonElement>(null);
  const okRef = useRef<HTMLButtonElement>(null);
  const danger = state?.tone === "danger";

  useEffect(() => {
    if (!state) return;
    const key = (e: KeyboardEvent) => e.key === "Escape" && onAnswer(false);
    window.addEventListener("keydown", key);
    const t = setTimeout(() => (danger ? cancelRef : okRef).current?.focus(), 50);
    return () => {
      window.removeEventListener("keydown", key);
      clearTimeout(t);
    };
  }, [state, danger, onAnswer]);

  return (
    <Portal>
      <AnimatePresence>
        {state && (
          <div className="fixed inset-0 z-[110] flex items-end sm:items-center justify-center p-3 sm:p-6 pb-[max(12px,env(safe-area-inset-bottom))]" role="alertdialog" aria-modal="true" aria-labelledby="ana-confirm-title">
            <motion.div className="absolute inset-0 bg-[rgba(24,22,15,0.36)]" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} onClick={() => onAnswer(false)} />
            <motion.div
              className="relative w-full sm:max-w-[400px] rounded-[24px] bg-bg shadow-[var(--shadow-lift)] p-5 sm:p-6"
              initial={reduce ? { opacity: 0 } : { y: 24, opacity: 0, scale: 0.98 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={reduce ? { opacity: 0 } : { y: 16, opacity: 0 }}
              transition={{ duration: 0.26, ease: [0.16, 1, 0.3, 1] }}
            >
              {danger && (
                <span className="grid place-items-center w-11 h-11 mb-3.5 rounded-[14px] bg-danger/10 text-danger" aria-hidden="true">
                  <DeleteMark size={22} />
                </span>
              )}
              <h2 id="ana-confirm-title" className="font-display text-[21px] font-semibold leading-[1.25] tracking-[-0.01em] text-ink text-pretty">
                {state.title}
              </h2>
              {state.body && <div className="mt-2 font-ui text-[14.5px] leading-[1.55] text-ink-soft text-pretty">{state.body}</div>}
              <div className="mt-6 flex flex-col-reverse sm:flex-row sm:justify-end gap-2.5">
                <Button ref={cancelRef} variant="secondary" className="sm:min-w-[110px]" onClick={() => onAnswer(false)}>
                  {state.cancelLabel ?? "Cancel"}
                </Button>
                <Button
                  ref={okRef}
                  className={cn("sm:min-w-[110px]", danger && "bg-danger text-white hover:brightness-110 shadow-none")}
                  onClick={() => onAnswer(true)}
                >
                  {state.confirmLabel ?? "OK"}
                </Button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </Portal>
  );
}
