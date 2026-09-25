"use client";

import { useState, useEffect, createContext, useContext, useCallback } from "react";
import { X, CheckCircle, WarningCircle, SpinnerGap } from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

type ToastType = "success" | "error" | "loading";

interface Toast {
  id: string;
  message: string;
  type: ToastType;
  duration?: number;
}

interface ToastContextType {
  toast: (message: string, type?: ToastType, duration?: number) => string;
  dismiss: (id: string) => void;
  update: (id: string, message: string, type: ToastType) => void;
}

const ToastContext = createContext<ToastContextType | null>(null);

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error("useToast must be inside ToastProvider");
  return ctx;
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback((message: string, type: ToastType = "success", duration = 3000): string => {
    const id = crypto.randomUUID();
    setToasts((prev) => [...prev, { id, message, type, duration }]);
    if (type !== "loading" && duration > 0) {
      setTimeout(() => dismiss(id), duration);
    }
    return id;
  }, [dismiss]);

  const update = useCallback((id: string, message: string, type: ToastType) => {
    setToasts((prev) => prev.map((t) => t.id === id ? { ...t, message, type } : t));
    if (type !== "loading") {
      setTimeout(() => dismiss(id), 3000);
    }
  }, [dismiss]);

  return (
    <ToastContext.Provider value={{ toast, dismiss, update }}>
      {children}
      {/* Toast container — top right */}
      <div className="fixed top-[max(16px,env(safe-area-inset-top))] inset-x-4 sm:inset-x-auto sm:right-5 z-[100] flex flex-col gap-2 items-center sm:items-end pointer-events-none [&>*]:pointer-events-auto">
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={() => dismiss(t.id)} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({ toast, onDismiss }: { toast: Toast; onDismiss: () => void }) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
  }, []);

  const icons = {
    success: <CheckCircle size={18} weight="fill" className="text-good" />,
    error: <WarningCircle size={18} weight="fill" className="text-accent" />,
    loading: <SpinnerGap size={18} weight="thin" className="text-accent animate-spin" />,
  };

  return (
    <div
      className={cn(
        "flex items-center gap-3 px-4 py-3 rounded-14 bg-surface border border-line shadow-xl transition-all duration-300",
        visible ? "opacity-100 translate-y-0" : "opacity-0 translate-y-4"
      )}
    >
      {icons[toast.type]}
      <span className="font-ui text-sm text-ink">{toast.message}</span>
      {toast.type !== "loading" && (
        <button onClick={onDismiss} className="text-ink-soft hover:text-ink ml-1">
          <X size={14} weight="thin" />
        </button>
      )}
    </div>
  );
}
