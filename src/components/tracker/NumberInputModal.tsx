"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";

interface NumberInputModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
  label: string;
  defaultValue?: number;
  min?: number;
  max?: number;
}

export function NumberInputModal({
  open,
  onClose,
  onSubmit,
  label,
  defaultValue = 0,
  min = 0,
  max = 9999,
}: NumberInputModalProps) {
  const [value, setValue] = useState(String(defaultValue));

  if (!open) return null;

  function handleSubmit() {
    const num = Math.min(max, Math.max(min, parseInt(value) || 0));
    onSubmit(num);
    onClose();
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface rounded-20 p-6 w-full max-w-[280px] shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink"
          aria-label="Close"
        >
          <X size={18} weight="thin" />
        </button>

        <p className="font-serif text-base text-ink mb-4">{label}</p>

        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          autoFocus
          className="w-full text-center text-3xl font-hand py-4 rounded-14 border border-line bg-surface-2 text-ink outline-none
                     [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
          value={value}
          onChange={(e) => {
            const v = e.target.value.replace(/[^0-9]/g, "");
            setValue(v);
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") handleSubmit();
          }}
        />

        <button
          onClick={handleSubmit}
          className="w-full mt-4 py-2.5 rounded-14 bg-accent text-bg font-ui text-sm font-medium"
        >
          Done
        </button>
      </div>
    </div>
  );
}
