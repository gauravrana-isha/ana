"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import { PracticeEditor } from "./PracticeEditor";
import { PracticeIcon } from "./PracticeIcon";
import { DoneCheckbox, FieldControl } from "./FieldInput";
import { setValue, specFor, toggleDone, valuesWithDefaults } from "@/lib/practiceSpec";
import type { Practice, DayLogEntry } from "@/lib/types";
import { cn } from "@/lib/utils";

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
  const { row, controls, probe, room, stacked } = useStacked(practice.name);

  return (
    <div ref={row} className="relative flex flex-wrap items-center gap-x-3 gap-y-2.5 p-3 sm:p-3.5 bg-surface rounded-14 mb-2">
      {/* An invisible copy of the name, set at the width it would have beside the controls, to
          tell whether it fits there in two lines. */}
      <span ref={probe} aria-hidden="true" className="invisible absolute left-0 top-0 font-serif text-base leading-snug hyphens-auto pointer-events-none" style={{ width: room }}>{practice.name}</span>
      <button
        type="button"
        onClick={() => editable && setEditing(true)}
        tabIndex={editable ? 0 : -1}
        aria-label={editable ? `Edit ${practice.name}` : practice.name}
        title="Edit name and usual values"
        className="group flex items-center gap-3 min-w-0 flex-1 text-left rounded-[10px]"
      >
        <PracticeIcon name={practice.name} iconName={practice.iconName} catalogId={practice.catalogId} />
        <span className="font-serif text-base text-ink leading-snug min-w-0 line-clamp-2 hyphens-auto group-hover:underline decoration-line underline-offset-4">{practice.name}</span>
      </button>

      {/* One row when the whole name fits beside the controls in two lines; otherwise the
          controls take their own line under it, so the name is never cut short. */}
      <div ref={controls} className={cn("flex items-center gap-1.5 sm:gap-2 ml-auto shrink-0", stacked && "basis-full justify-end")}>
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

/**
 * Whether a row's controls should go under the name: true when the name, at the width left
 * beside the controls, would need more than two lines.
 */
function useStacked(name: string) {
  const row = useRef<HTMLDivElement>(null);
  const controls = useRef<HTMLDivElement>(null);
  const probe = useRef<HTMLSpanElement>(null);
  const [room, setRoom] = useState(0);
  const [on, setOn] = useState(false);

  useLayoutEffect(() => {
    const r = row.current, c = controls.current, p = probe.current;
    if (!r || !c || !p) return;
    const measure = () => {
      const pad = parseFloat(getComputedStyle(r).paddingLeft) * 2;
      // Row width, less the controls, the icon (36) and the gaps beside it (12 + 12).
      const width = Math.max(0, r.clientWidth - pad - c.offsetWidth - 36 - 24);
      p.style.width = `${width}px`;
      const line = parseFloat(getComputedStyle(p).lineHeight) || 22;
      setRoom(width);
      setOn(width < 64 || p.offsetHeight > line * 2 + 1);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(r);
    return () => ro.disconnect();
  }, [name]);

  return { row, controls, probe, room, stacked: on };
}
