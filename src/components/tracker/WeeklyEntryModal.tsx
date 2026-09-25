"use client";

import { useState } from "react";
import { PickerPanel } from "@/components/ui/pickers";
import { PracticeRow } from "./PracticeRow";
import { Busy } from "@/components/ui/Busy";
import { ButtonLoader } from "@/components/ui/Loader";
import type { Practice, DayLogEntry } from "@/lib/types";

interface WeeklyEntryModalProps {
  open: boolean;
  onClose: () => void;
  practice: Practice;
  date: string;
  entry: DayLogEntry | undefined;
  onSave: (practiceId: string, entry: Partial<DayLogEntry>) => Promise<void> | void;
}

/** Edit one practice on one day from the week view. */
export function WeeklyEntryModal({ open, onClose, practice, date, entry, onSave }: WeeklyEntryModalProps) {
  const [local, setLocal] = useState<DayLogEntry>(entry ?? { done: false, values: {} });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(false);

  async function save() {
    setSaving(true);
    setError(false);
    try {
      await onSave(practice.id, local);
      onClose();
    } catch {
      setError(true);
    } finally {
      setSaving(false);
    }
  }
  const dayLabel = new Date(date + "T12:00:00").toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

  return (
    <PickerPanel
      open={open}
      onClose={onClose}
      title={dayLabel}
      footer={
        <>
          <button type="button" onClick={onClose} disabled={saving} className="press flex-1 h-11 rounded-[14px] bg-surface-2 text-ink font-ui text-[14px] font-semibold disabled:opacity-50">Cancel</button>
          <button type="button" onClick={save} disabled={saving} aria-busy={saving || undefined} className="press relative flex-1 h-11 rounded-[14px] bg-accent text-bg font-ui text-[14px] font-semibold">
            <span className={saving ? "invisible" : ""}>Save</span>
            {saving && <ButtonLoader className="absolute inset-0 m-auto w-fit h-fit" />}
          </button>
        </>
      }
    >
      <Busy busy={saving} className="-mx-1">
        <PracticeRow editable={false} practice={practice} entry={local} onChange={(_, e) => setLocal({ done: !!e.done, values: e.values ?? {} })} />
      </Busy>
      {error && <p role="alert" className="mt-2 font-ui text-[13px] text-danger">Couldn&rsquo;t save. Please try again.</p>}
    </PickerPanel>
  );
}
