"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Minus, Plus, Trash } from "@phosphor-icons/react";
import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TimeField } from "@/components/ui/pickers";
import { keys } from "@/lib/queries";
import { DEFAULT_SCALE, SCALE_KEYS, specFor, type FieldSpec } from "@/lib/practiceSpec";
import { describeTracking } from "@/lib/practiceCatalog";
import type { Practice } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PracticeIcon } from "./PracticeIcon";

type Draft = Record<string, { default?: string | number | null; fill?: number | null }>;

/**
 * Edit one practice: its name, and the values it uses. For rhythm practices that's the default
 * (used on days you don't change it); for everything else it's what a tick fills in.
 */
export function PracticeEditor({ practice, open, onClose }: { practice: Practice | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [draft, setDraft] = useState<Draft>({});
  const [saving, setSaving] = useState<null | "save" | "remove">(null);
  const [openedFor, setOpenedFor] = useState<string | null>(null);

  const spec = practice ? specFor(practice) : null;
  const key = open && practice ? practice.id : null;
  if (key !== openedFor) {
    setOpenedFor(key);
    if (key && practice && spec) {
      setName(practice.name);
      setDraft(Object.fromEntries(spec.fields.map((f) => [f.key, spec.rhythm ? { default: f.default ?? null } : { fill: f.fill ?? null }])));
      setSaving(null);
    }
  }

  if (!practice || !spec) return null;

  const set = (k: string, v: Draft[string]) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...v } }));

  async function save() {
    if (!practice || !spec || !name.trim()) return;
    setSaving("save");
    const fields = Object.fromEntries(spec.fields.map((f) => [f.key, { kind: f.kind, ...draft[f.key] }]));
    const res = await fetch("/api/practices", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: practice.id, name: name.trim(), fields }),
    });
    if (!res.ok) {
      setSaving(null);
      return toast("Couldn't save. Please try again.", "error");
    }
    await qc.invalidateQueries({ queryKey: keys.practices() });
    toast(`${name.trim()} updated`, "success", 1600);
    setSaving(null);
    onClose();
  }

  async function remove() {
    if (!practice || !confirm(`Remove ${practice.name}? Days you've already logged stay as they are.`)) return;
    setSaving("remove");
    const res = await fetch("/api/practices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: practice.id }) });
    if (!res.ok) {
      setSaving(null);
      return toast("Couldn't remove. Please try again.", "error");
    }
    await qc.invalidateQueries({ queryKey: keys.practices() });
    toast(`${practice.name} removed`, "success", 1600);
    setSaving(null);
    onClose();
  }

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title="Edit practice"
      busy={!!saving}
      footer={
        <div className="flex items-center gap-3">
          <Button variant="danger" onClick={remove} loading={saving === "remove"} disabled={!!saving}>
            <Trash size={16} /> Remove
          </Button>
          <span className="flex-1" />
          <Button variant="secondary" onClick={onClose} disabled={!!saving}>Cancel</Button>
          <Button onClick={save} loading={saving === "save"} disabled={!!saving || !name.trim()}>Save</Button>
        </div>
      }
    >
      <div className="flex flex-col gap-6">
        <div className="flex items-center gap-4">
          <PracticeIcon name={practice.name} iconName={practice.iconName} catalogId={practice.catalogId} size={56} className="rounded-[14px]" />
          <label className="flex-1">
            <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value.slice(0, 50))} className="mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent" />
          </label>
        </div>

        <p className="font-ui text-[13.5px] text-ink-soft -mt-2">
          Tracks {describeTracking(spec.fields, spec.hasDoneToggle)}.
        </p>

        {spec.fields.length === 0 ? (
          <p className="rounded-[14px] bg-surface p-4 font-ui text-[14px] text-ink-soft">A tick is all this practice needs.</p>
        ) : (
          <section className="flex flex-col gap-3">
            <div>
              <h3 className="font-display text-[17px] font-semibold text-ink">{spec.rhythm ? "Defaults" : "When you tick it"}</h3>
              <p className="font-ui text-[13px] text-ink-soft mt-0.5">
                {spec.rhythm
                  ? "Used on days you don't change it, so this is never empty."
                  : "Filled in for you when you tick the practice. Leave blank to fill nothing."}
              </p>
            </div>
            {spec.fields.map((f) => (
              <FieldDefault key={f.key} field={f} rhythm={spec.rhythm} value={draft[f.key]} onChange={(v) => set(f.key, v)} practiceName={practice.name} />
            ))}
          </section>
        )}
      </div>
    </Sheet>
  );
}

function FieldDefault({ field, rhythm, value, onChange, practiceName }: { field: FieldSpec; rhythm: boolean; value: Draft[string] | undefined; onChange: (v: Draft[string]) => void; practiceName: string }) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-[16px] bg-surface p-3.5">
      <div className="min-w-0">
        <p className="font-ui text-[14.5px] font-semibold text-ink">{field.title}</p>
        {field.hint && <p className="font-ui text-[12.5px] text-ink-soft">{field.hint}</p>}
      </div>
      {field.kind === "TIME" ? (
        <TimeField compact label={`${practiceName} default time`} value={String(value?.default ?? "")} onChange={(t) => onChange({ default: t })} />
      ) : field.kind === "ICONSCALE" ? (
        <div role="radiogroup" aria-label={`${practiceName} default level`} className="flex p-1 rounded-full bg-surface-2">
          {SCALE_KEYS.map((k, i) => (
            <button key={k} type="button" role="radio" aria-checked={value?.default === k} onClick={() => onChange({ default: k })} className={cn("press h-8 px-3 rounded-full font-ui text-[12.5px] font-semibold", value?.default === k ? "bg-accent text-bg" : "text-ink-soft")}>
              {(field.labels ?? DEFAULT_SCALE)[i]}
            </button>
          ))}
        </div>
      ) : field.taps ? (
        <div role="radiogroup" aria-label={`${practiceName}: ${field.title} when ticked`} className="flex p-1 rounded-full bg-surface-2">
          {[0, ...Array.from({ length: field.max ?? 2 }, (_, i) => i + 1)].map((n) => {
            const on = (rhythm ? value?.default : value?.fill) === (n || null) || (!n && !(rhythm ? value?.default : value?.fill));
            return (
              <button key={n} type="button" role="radio" aria-checked={on} onClick={() => onChange(rhythm ? { default: n || null } : { fill: n || null })} className={cn("press h-8 min-w-[44px] px-2.5 rounded-full font-ui text-[13px] font-semibold tabular", on ? "bg-accent text-bg" : "text-ink-soft")}>
                {n ? `${n}×` : "None"}
              </button>
            );
          })}
        </div>
      ) : (
        <Stepper
          value={Number(rhythm ? value?.default ?? 0 : value?.fill ?? 0)}
          unit={field.unit}
          label={`${practiceName}: usual ${field.title}`}
          max={field.max}
          onChange={(n) => onChange(rhythm ? { default: n || null } : { fill: n || null })}
        />
      )}
    </div>
  );
}

function Stepper({ value, unit, label, max = 99999, onChange }: { value: number; unit: string; label: string; max?: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.min(max, Math.max(0, n));
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button type="button" aria-label="Less" onClick={() => onChange(clamp(value - 1))} className="press grid place-items-center w-9 h-9 rounded-full bg-surface-2 text-ink"><Minus size={15} /></button>
      <label className="flex flex-col items-center w-[64px]">
        <input
          aria-label={label}
          inputMode="numeric"
          value={value || ""}
          placeholder="–"
          onChange={(e) => onChange(clamp(parseInt(e.target.value.replace(/\D/g, "")) || 0))}
          className="w-full h-9 text-center rounded-[10px] bg-bg font-ui text-[16px] font-semibold text-ink tabular outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/50"
        />
        <span className="font-ui text-[10.5px] text-ink-soft mt-0.5">{unit}</span>
      </label>
      <button type="button" aria-label="More" onClick={() => onChange(clamp(value + 1))} className="press grid place-items-center w-9 h-9 rounded-full bg-surface-2 text-ink"><Plus size={15} /></button>
    </div>
  );
}
