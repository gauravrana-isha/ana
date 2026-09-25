"use client";

import { useMemo, useState } from "react";
import { PracticeEditor } from "./PracticeEditor";
import { PracticeIcon } from "./PracticeIcon";
import { DoneCheckbox, FieldControl } from "./FieldInput";
import { setValue, specFor, toggleDone, valuesWithDefaults } from "@/lib/practiceSpec";
import type { Practice, DayLogEntry } from "@/lib/types";

interface PracticeRowProps {
  practice: Practice;
  entry: DayLogEntry | undefined;
  onChange: (practiceId: string, entry: Partial<DayLogEntry>) => void;
  /** Tapping the name opens the practice editor. */
  editable?: boolean;
}

export function PracticeRow({ practice, entry, onChange, editable = true }: PracticeRowProps) {
  const spec = useMemo(() => specFor(practice), [practice]);
  const values = spec.rhythm ? valuesWithDefaults(spec, entry?.values) : entry?.values ?? {};
  const [editing, setEditing] = useState(false);

  return (
    <div className="flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3 sm:p-3.5 bg-surface rounded-14 mb-2">
      <button
        type="button"
        onClick={() => editable && setEditing(true)}
        tabIndex={editable ? 0 : -1}
        aria-label={editable ? `Edit ${practice.name}` : practice.name}
        title="Edit name and usual values"
        className="group flex items-center gap-3 min-w-0 flex-1 basis-[180px] text-left rounded-[10px]"
      >
        <PracticeIcon name={practice.name} iconName={practice.iconName} catalogId={practice.catalogId} />
        <span className="font-serif text-base text-ink leading-snug min-w-0 group-hover:underline decoration-line underline-offset-4">{practice.name}</span>
      </button>

      <div className="flex items-center gap-2 ml-auto">
        {spec.fields.map((field) => (
          <FieldControl
            key={field.key}
            field={field}
            value={values[field.key]}
            practiceName={practice.name}
            onChange={(key, v) => onChange(practice.id, setValue(spec, entry, key, v))}
          />
        ))}
        {spec.hasDoneToggle && (
          <DoneCheckbox
            done={!!entry?.done}
            label={`${practice.name} done`}
            onToggle={() => onChange(practice.id, toggleDone(spec, entry))}
          />
        )}
      </div>
      {editable && <PracticeEditor practice={practice} open={editing} onClose={() => setEditing(false)} />}
    </div>
  );
}
