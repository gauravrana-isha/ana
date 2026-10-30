"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";

import { Sheet } from "@/components/ui/Sheet";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { TimeField } from "@/components/ui/pickers";
import { keys } from "@/lib/queries";
import { deletePractice, editPractice, mergeFields } from "@/lib/journal";
import { DEFAULT_SCALE, SCALE_KEYS, specFor, type FieldSpec } from "@/lib/practiceSpec";
import { describeTracking } from "@/lib/practiceCatalog";
import type { Practice } from "@/lib/types";
import { Segmented } from "@/components/ui/Segmented";
import { PracticeIcon } from "./PracticeIcon";
import { DeleteMark, MinusMark, PlusMark } from "@/components/art/PenMarks";
import { useConfirm } from "@/components/ui/Confirm";

type Draft = Record<string, { default?: string | number | null; fill?: number | null; labels?: [string, string, string] | null; max?: number | null }>;

/**
 * Edit one practice: its name, and the values it uses. For rhythm practices that's the default
 * (used on days you don't change it); for everything else it's what a tick fills in.
 */
export function PracticeEditor({ practice, open, onClose }: { practice: Practice | null; open: boolean; onClose: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const ask = useConfirm();
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
      setDraft(
        Object.fromEntries(
          spec.fields.map((f) => [
            f.key,
            {
              ...(spec.rhythm ? { default: f.default ?? null } : { fill: f.fill ?? null }),
              ...(f.kind === "ICONSCALE" ? { labels: f.labels ?? DEFAULT_SCALE } : {}),
              ...(f.taps && practice.tier === "CUSTOM" ? { max: f.max ?? 2 } : {}),
            },
          ])
        )
      );
      setSaving(null);
    }
  }

  if (!practice || !spec) return null;

  const set = (k: string, v: Draft[string]) => setDraft((d) => ({ ...d, [k]: { ...d[k], ...v } }));

  async function save() {
    if (!practice || !spec || !name.trim()) return;
    setSaving("save");
    // Level names: blank ones fall back to Low / Medium / High; unchanged defaults aren't stored.
    const cleaned: Draft = Object.fromEntries(
      Object.entries(draft).map(([k, v]) => {
        if (!v.labels) return [k, v];
        const labels = v.labels.map((l, n) => l.trim() || DEFAULT_SCALE[n]) as [string, string, string];
        return [k, { ...v, labels: labels.every((l, n) => l === DEFAULT_SCALE[n]) ? null : labels }];
      })
    );
    try {
      await editPractice(practice.id, { name: name.trim(), fields: mergeFields(practice.fields, spec.fields, cleaned) });
    } catch {
      setSaving(null);
      return toast("Couldn't save. Please try again.", "error");
    }
    void qc.invalidateQueries({ queryKey: keys.practices() });
    toast(`${name.trim()} updated`, "success", 1600);
    setSaving(null);
    onClose();
  }

  async function remove() {
    if (!practice || !(await ask({ title: `Remove ${practice.name}?`, body: "Days you've already logged stay as they are.", confirmLabel: "Remove", tone: "danger" }))) return;
    setSaving("remove");
    try {
      await deletePractice(practice.id);
    } catch {
      setSaving(null);
      return toast("Couldn't remove. Please try again.", "error");
    }
    void qc.invalidateQueries({ queryKey: keys.practices() });
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
            <DeleteMark size={18} /> Remove
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
              <FieldDefault
                key={f.key}
                field={{ ...f, labels: draft[f.key]?.labels ?? f.labels, max: draft[f.key]?.max ?? f.max }}
                rhythm={spec.rhythm}
                value={draft[f.key]}
                onChange={(v) => set(f.key, v)}
                practiceName={practice.name}
              />
            ))}
          </section>
        )}

        {/* How it's tracked, where it can change: the names of the three levels, and how many
            times a day (library practices keep their own count). */}
        {spec.fields.some((f) => f.kind === "ICONSCALE" || (f.taps && practice.tier === "CUSTOM")) && (
          <section className="flex flex-col gap-3">
            <h3 className="font-display text-[17px] font-semibold text-ink">Tracking</h3>
            {spec.fields.map((f) =>
              f.kind === "ICONSCALE" ? (
                <LevelNames key={f.key} labels={draft[f.key]?.labels ?? f.labels ?? DEFAULT_SCALE} onChange={(labels) => set(f.key, { labels })} />
              ) : f.taps && practice.tier === "CUSTOM" ? (
                <div key={f.key} className="flex items-center justify-between gap-3 rounded-[16px] bg-surface p-3.5">
                  <p className="font-ui text-[14.5px] font-semibold text-ink">Times a day, up to</p>
                  <UpTo
                    label={`${practice.name}: times a day, up to`}
                    value={draft[f.key]?.max ?? f.max ?? 2}
                    onChange={(max) => {
                      // A usual value above the new limit comes down to it.
                      const v = draft[f.key] ?? {};
                      const cap = (n: unknown) => (typeof n === "number" && n > max ? max : n);
                      set(f.key, { max, ...(v.fill !== undefined ? { fill: cap(v.fill) as number | null } : {}), ...(v.default !== undefined ? { default: cap(v.default) as number | null } : {}) });
                    }}
                  />
                </div>
              ) : null
            )}
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
        <Segmented
          label={`${practiceName} default level`}
          tone="accent"
          size="sm"
          className="bg-surface-2"
          value={(value?.default as string) ?? null}
          onChange={(k) => onChange({ default: k })}
          options={SCALE_KEYS.map((k, n) => ({ value: k, label: (field.labels ?? DEFAULT_SCALE)[n] }))}
        />
      ) : field.taps ? (
        <Segmented
          label={`${practiceName}: ${field.title} when ticked`}
          tone="accent"
          size="sm"
          className="bg-surface-2"
          itemClassName="min-w-[44px] px-2.5 tabular"
          value={String((rhythm ? value?.default : value?.fill) || 0)}
          onChange={(v) => onChange(rhythm ? { default: Number(v) || null } : { fill: Number(v) || null })}
          options={[0, ...Array.from({ length: field.max ?? 2 }, (_, k) => k + 1)].map((n) => ({ value: String(n), label: n ? `${n}×` : "None" }))}
        />
      ) : (
        <Stepper
          value={Number(rhythm ? value?.default ?? 0 : value?.fill ?? 0)}
          label={`${practiceName}: usual ${field.title}`}
          max={field.max}
          onChange={(n) => onChange(rhythm ? { default: n || null } : { fill: n || null })}
        />
      )}
    </div>
  );
}

/** The names of a 3-level scale's levels (Low, Medium, High unless renamed). */
export function LevelNames({ labels, onChange }: { labels: [string, string, string]; onChange: (labels: [string, string, string]) => void }) {
  return (
    <fieldset className="rounded-[16px] bg-surface p-3.5">
      <legend className="sr-only">Names of the three levels</legend>
      <p className="font-ui text-[14.5px] font-semibold text-ink" aria-hidden="true">Names of the three levels</p>
      <p className="font-ui text-[12.5px] text-ink-soft">e.g. Few words · Some · Many</p>
      <div className="mt-3 grid grid-cols-3 gap-2">
        {labels.map((l, n) => (
          <input
            key={n}
            value={l}
            aria-label={`Level ${n + 1}`}
            placeholder={DEFAULT_SCALE[n]}
            onChange={(e) => onChange(labels.map((x, i) => (i === n ? e.target.value.slice(0, 16) : x)) as [string, string, string])}
            className="min-w-0 h-11 px-3 rounded-[12px] bg-surface-2 text-ink font-ui text-[15px] outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/80"
          />
        ))}
      </div>
    </fieldset>
  );
}

/** How many times a day a practice can be ticked: 2× or 3×. */
export function UpTo({ label, value, onChange }: { label: string; value: number; onChange: (n: number) => void }) {
  return (
    <Segmented
      label={label}
      tone="accent"
      size="sm"
      className="bg-surface-2"
      itemClassName="min-w-[44px] px-2.5 tabular"
      value={String(value)}
      onChange={(v) => onChange(Number(v))}
      options={[2, 3].map((n) => ({ value: String(n), label: `${n}×` }))}
    />
  );
}

/** The usual number, just the number: the row's own title already names it. */
function Stepper({ value, label, max = 99999, onChange }: { value: number; label: string; max?: number; onChange: (n: number) => void }) {
  const clamp = (n: number) => Math.min(max, Math.max(0, n));
  return (
    <div className="flex items-center gap-1.5 shrink-0">
      <button type="button" aria-label="Less" onClick={() => onChange(clamp(value - 1))} className="press grid place-items-center w-9 h-9 rounded-full bg-surface-2 text-ink"><MinusMark size={17} /></button>
      <label className="block w-[64px]">
        <input
          aria-label={label}
          inputMode="numeric"
          value={value || ""}
          placeholder="–"
          onChange={(e) => onChange(clamp(parseInt(e.target.value.replace(/\D/g, "")) || 0))}
          className="w-full h-9 text-center rounded-[10px] bg-bg font-ui text-[16px] font-semibold text-ink tabular outline-none border border-transparent focus:border-accent placeholder:text-ink-soft/50"
        />
      </label>
      <button type="button" aria-label="More" onClick={() => onChange(clamp(value + 1))} className="press grid place-items-center w-9 h-9 rounded-full bg-surface-2 text-ink"><PlusMark size={17} /></button>
    </div>
  );
}
