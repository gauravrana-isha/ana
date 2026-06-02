"use client";

import {
  Sun, EyeClosed, Wind, SunDim, PersonSimpleTaiChi, Waveform,
  Circle, CircleNotch, Triangle, Star, Moon, BowlFood, Smiley,
} from "@phosphor-icons/react";
import * as AllIcons from "@phosphor-icons/react";
import { FieldInput, DoneCheckbox, CountCheckboxes } from "./FieldInput";
import type { Practice, DayLogEntry, PracticeField } from "@/lib/types";

// Map icon names to actual components for the 13 default practices
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const ICON_MAP: Record<string, any> = {
  Sun, EyeClosed, Wind, SunDim, PersonSimpleTaiChi, Waveform,
  Circle, CircleNotch, Pyramid: Triangle, Triangle, Star, Moon, BowlFood, Smiley,
  Bowl: BowlFood,
};

interface PracticeRowProps {
  practice: Practice;
  entry: DayLogEntry | undefined;
  onChange: (practiceId: string, entry: Partial<DayLogEntry>) => void;
}

export function PracticeRow({ practice, entry, onChange }: PracticeRowProps) {
  const done = entry?.done ?? false;
  const values = entry?.values ?? {};
  const fields: PracticeField[] = Array.isArray(practice.fields) ? practice.fields : [];
  const IconComponent = getIcon(practice.iconName);

  function handleDoneToggle() {
    onChange(practice.id, { done: !done, values });
  }

  function handleValueChange(key: string, val: string | number) {
    // Auto-check done when a value is entered
    const shouldAutoDone = practice.hasDoneToggle && !done && val !== "" && val !== 0;
    const newValues = { ...values, [key]: val };

    // Shakti Chalana: if kapal is set, auto-set times to 1
    if (practice.name === "Shakti Chalana" && key === "kapal" && typeof val === "number" && val > 0) {
      if (!newValues.times || newValues.times === 0) {
        newValues.times = 1;
      }
    }

    onChange(practice.id, { done: shouldAutoDone ? true : done, values: newValues });
  }

  return (
    <div className="flex items-center justify-between p-[14px_16px] bg-surface rounded-14 mb-2">
      {/* Left: icon + name */}
      <div className="flex items-center gap-3 min-w-0">
        <div className="w-[34px] h-[34px] rounded-9 bg-accent-soft text-accent grid place-items-center shrink-0">
          {IconComponent ? (
            <IconComponent size={18} weight="thin" />
          ) : (
            <span className="text-xs font-ui">{practice.name.charAt(0)}</span>
          )}
        </div>
        <div className="font-serif text-base text-ink truncate">
          {practice.name}
        </div>
      </div>

      {/* Right: practice-specific inputs */}
      <div className="flex items-center gap-2 shrink-0">
        {renderInputs(practice.name, fields, values, done, handleDoneToggle, handleValueChange)}
      </div>
    </div>
  );
}

function renderInputs(
  name: string,
  fields: PracticeField[],
  values: Record<string, string | number>,
  done: boolean,
  onDoneToggle: () => void,
  onChange: (key: string, val: string | number) => void,
) {
  switch (name) {
    case "Wake up":
      return (
        <FieldInput
          field={{ key: "time", kind: "TIME" }}
          value={values.time || "04:30"}
          onChange={onChange}
          practiceName="Wake up"
        />
      );

    case "Bedtime":
      return (
        <FieldInput
          field={{ key: "time", kind: "TIME" }}
          value={values.time || "21:30"}
          onChange={onChange}
          practiceName="Bedtime"
        />
      );

    case "Shambhavi":
      return (
        <CountCheckboxes
          value={typeof values.count === "number" ? values.count : 0}
          max={2}
          onChange={(v) => onChange("count", v)}
        />
      );

    case "Shakti Chalana":
      // Show as: [1] [2] | kapal count button showing "100/1" style
      return (
        <>
          <FieldInput
            field={{ key: "kapal", kind: "COUNT", max: 999 }}
            value={values.kapal ?? 100}
            onChange={onChange}
            practiceName="Kapal Bhati"
          />
          <span className="text-ink-soft font-ui text-xs">/</span>
          <CountCheckboxes
            value={typeof values.times === "number" ? values.times : 0}
            max={2}
            onChange={(v) => onChange("times", v)}
          />
        </>
      );

    case "Shoonya":
      return (
        <CountCheckboxes
          value={typeof values.count === "number" ? values.count : 2}
          max={2}
          onChange={(v) => onChange("count", v)}
        />
      );

    case "Surya Kriya":
      return (
        <>
          <DoneCheckbox done={done} onToggle={onDoneToggle} />
          <FieldInput
            field={{ key: "min", kind: "MINUTES" }}
            value={values.min ?? 12}
            onChange={onChange}
            practiceName="Surya Kriya"
          />
        </>
      );

    case "Breath Watching":
      return (
        <>
          <DoneCheckbox done={done} onToggle={onDoneToggle} />
          <FieldInput
            field={fields.find(f => f.kind === "MINUTES") ?? { key: "min", kind: "MINUTES" }}
            value={values.min ?? 40}
            onChange={onChange}
            practiceName={name}
          />
        </>
      );

    case "Samyama":
      return (
        <>
          <DoneCheckbox done={done} onToggle={onDoneToggle} />
          <FieldInput
            field={fields.find(f => f.kind === "MINUTES") ?? { key: "min", kind: "MINUTES" }}
            value={values.min ?? 30}
            onChange={onChange}
            practiceName={name}
          />
        </>
      );

    case "Yogasanas":
    case "Dhyanalinga":
    case "Lingabhairavi":
      return (
        <>
          <DoneCheckbox done={done} onToggle={onDoneToggle} />
          <FieldInput
            field={fields.find(f => f.kind === "MINUTES") ?? { key: "min", kind: "MINUTES" }}
            value={values.min ?? 0}
            onChange={onChange}
            practiceName={name}
          />
        </>
      );

    case "Eating consciously":
      return (
        <FieldInput
          field={{ key: "level", kind: "ICONSCALE" }}
          value={values.level}
          onChange={onChange}
          practiceName="Eating"
        />
      );

    case "Mood":
      return (
        <FieldInput
          field={{ key: "mood", kind: "MOOD" }}
          value={values.mood}
          onChange={onChange}
          practiceName="Mood"
        />
      );

    default:
      return (
        <>
          <DoneCheckbox done={done} onToggle={onDoneToggle} />
          {fields.map((field) => (
            <FieldInput
              key={field.key}
              field={field}
              value={values[field.key]}
              onChange={onChange}
              practiceName={name}
            />
          ))}
        </>
      );
  }
}

function getIcon(name: string): React.ComponentType<{ size?: number; weight?: string }> | null {
  // Check our explicit map first
  if (ICON_MAP[name]) return ICON_MAP[name];
  // Then try the full Phosphor library
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const icon = (AllIcons as any)[name];
  if (typeof icon === "function") return icon;
  return null;
}
