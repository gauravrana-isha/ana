"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { PracticeRow } from "./PracticeRow";
import type { Practice, DayLogEntry } from "@/lib/types";

interface WeeklyEntryModalProps {
  open: boolean;
  onClose: () => void;
  practice: Practice;
  date: string;
  entry: DayLogEntry | undefined;
  onSave: (practiceId: string, entry: Partial<DayLogEntry>) => void;
}

export function WeeklyEntryModal({ open, onClose, practice, date, entry, onSave }: WeeklyEntryModalProps) {
  const [localEntry, setLocalEntry] = useState<DayLogEntry>(entry ?? { done: false, values: {} });

  if (!open) return null;

  function handleChange(_practiceId: string, update: Partial<DayLogEntry>) {
    setLocalEntry(prev => ({
      done: update.done ?? prev.done,
      values: { ...prev.values, ...(update.values ?? {}) },
    }));
  }

  function handleSave() {
    onSave(practice.id, localEntry);
    onClose();
  }

  const dayLabel = new Date(date + "T12:00:00").toLocaleDateString("en-US", { weekday: "short", month: "short", day: "numeric" });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-surface rounded-20 p-5 w-full max-w-[380px] shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink"
          aria-label="Close"
        >
          <X size={18} weight="thin" />
        </button>

        <div className="font-hand text-lg text-accent mb-1">{dayLabel}</div>
        <div className="font-serif text-base text-ink mb-4">{practice.name}</div>

        {/* Render the practice row inline */}
        <div className="bg-surface-2 rounded-14 -mx-1">
          <PracticeRow
            practice={practice}
            entry={localEntry}
            onChange={handleChange}
          />
        </div>

        <button
          onClick={handleSave}
          className="w-full mt-4 py-2.5 rounded-14 bg-accent text-bg font-ui text-sm font-medium"
        >
          Save
        </button>
      </div>
    </div>
  );
}
