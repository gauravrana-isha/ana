"use client";

import { useState, useEffect, useRef, createContext, useContext, useCallback } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";

import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "loading";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration: number;
  /** Bumped on update, so the item restarts its timer. */
  rev: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
  update: (id: string, message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

// Errors stay longer: they're read, not glanced at.
const LASTS: Record<ToastType, number> = { success: 2600, error: 5000, loading: 0 };
const MOST = 3;

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

/**
 * Toasts are a quiet word at the bottom, above the tab bar, where the thumb is and nothing is
 * covered (the top holds the title and the connection notice). One ink pill each, at most three;
 * the same words again replace the old one. They pause while touched, and a tap or a swipe lets
 * them go.
 */
export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success", duration?: number): string => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev.filter((t) => t.message !== message), { id, message, type, duration: duration ?? LASTS[type], rev: 0 }].slice(-MOST));
    return id;
  }, []);

  const update = useCallback((id: string, message: string, type: ToastType) => {
    setToasts((prev) => prev.map((t) => (t.id === id ? { ...t, message, type, duration: LASTS[type] || 3000, rev: t.rev + 1 } : t)));
  }, []);

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      <section aria-label="Notifications" className="ana-toasts pointer-events-none fixed inset-x-0 z-[100] flex flex-col items-center gap-2 px-4">
        <AnimatePresence initial={false}>
          {toasts.map((t) => (
            <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
          ))}
        </AnimatePresence>
      </section>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const still = useReducedMotion();
  const [held, setHeld] = useState(false);
  const left = useRef(toast.duration);

  useEffect(() => {
    left.current = toast.duration;
  }, [toast.rev, toast.duration]);

  // Count down only while nobody is touching it.
  useEffect(() => {
    if (toast.type === "loading" || held || left.current <= 0) return;
    const start = Date.now();
    const timer = setTimeout(onDismiss, left.current);
    return () => {
      clearTimeout(timer);
      left.current -= Date.now() - start;
    };
  }, [held, toast.type, toast.rev, onDismiss]);

  const loading = toast.type === "loading";

  return (
    <motion.div
      layout={!still}
      role={toast.type === "error" ? "alert" : "status"}
      initial={still ? { opacity: 0 } : { opacity: 0, y: 24, scale: 0.94, filter: "blur(6px)" }}
      animate={{ opacity: 1, y: 0, scale: 1, filter: "blur(0px)" }}
      exit={still ? { opacity: 0 } : { opacity: 0, y: 12, scale: 0.96, filter: "blur(4px)", transition: { duration: 0.18 } }}
      transition={{ type: "spring", stiffness: 420, damping: 32 }}
      drag={loading ? false : true}
      dragSnapToOrigin
      dragElastic={0.5}
      onDragEnd={(_, info) => {
        if (Math.abs(info.offset.x) > 70 || info.offset.y > 36) onDismiss();
      }}
      onPointerEnter={() => setHeld(true)}
      onPointerLeave={() => setHeld(false)}
      onPointerDown={() => setHeld(true)}
      onTap={loading ? undefined : onDismiss}
      className={cn(
        "pointer-events-auto flex items-center gap-2.5 max-w-[420px] min-h-11 pl-2.5 pr-4 py-2 rounded-[22px]",
        "bg-ink text-bg shadow-[0_14px_36px_-14px_rgba(20,18,12,0.55)] ring-1 ring-black/5 dark:ring-white/10",
        !loading && "cursor-pointer select-none touch-none"
      )}
    >
      <Mark type={toast.type} />
      <span className="font-ui text-[14px] leading-[1.35] font-medium">{toast.message}</span>
    </motion.div>
  );
}

function Mark({ type }: { type: ToastType }) {
  if (type === "loading") {
    return <span aria-hidden="true" className="shrink-0 w-[22px] h-[22px] rounded-full border-2 border-bg/25 border-t-bg animate-spin" />;
  }
  return (
    <span aria-hidden="true" className={cn("shrink-0 grid place-items-center w-[22px] h-[22px] rounded-full text-white", type === "success" ? "bg-good" : "bg-danger")}>
      <svg viewBox="0 0 16 16" width="12" height="12" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
        {type === "success" ? <path d="M3.5 8.5l3 3 6-7" className="ana-toast-tick" /> : <path d="M8 4v5M8 12h.01" />}
      </svg>
    </span>
  );
}
