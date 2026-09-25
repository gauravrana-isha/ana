"use client";

import { Busy } from "@/components/ui/Busy";

import { createElement, useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useQueryClient } from "@tanstack/react-query";
import * as Icons from "@phosphor-icons/react";
import type { IconProps } from "@phosphor-icons/react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";
import { keys, usePractices } from "@/lib/queries";
import { catalogFor, describeTracking, type CatalogPractice } from "@/lib/practiceCatalog";
import type { PracticeField } from "@/lib/types";
import { cn } from "@/lib/utils";
import { PracticeLibrary } from "./PracticeLibrary";
import { PracticeEditor } from "./PracticeEditor";
import { specFor } from "@/lib/practiceSpec";
import { BusyBar } from "@/components/ui/Busy";
import { ButtonLoader } from "@/components/ui/Loader";
import type { Practice } from "@/lib/types";

import { PaintedTile, PracticeIcon } from "./PracticeIcon";

const ICON_OPTIONS = [
  "Leaf", "Flower", "FlowerLotus", "Sun", "SunHorizon", "Moon", "Star", "Sparkle",
  "Fire", "Drop", "Wind", "Mountains", "Tree", "Plant", "Heart", "HandHeart",
  "HandsPraying", "Person", "PersonSimpleWalk", "PersonSimpleTaiChi", "Waveform", "MusicNotes", "BookOpen", "PencilSimple",
  "BowlSteam", "Coffee", "Bed", "Bicycle", "Barbell", "Brain", "Eye", "Bell",
] as const;

const TRACK_OPTIONS: { id: string; label: string; hint: string; icon: string; hasDoneToggle: boolean; fields: PracticeField[] }[] = [
  { id: "done", label: "Just done", hint: "A single tick", icon: "CheckCircle", hasDoneToggle: true, fields: [] },
  { id: "minutes", label: "Minutes", hint: "Tick, and how long", icon: "Timer", hasDoneToggle: true, fields: [{ key: "min", kind: "MINUTES" }] },
  { id: "count", label: "Count", hint: "Tick, and how many", icon: "Hash", hasDoneToggle: true, fields: [{ key: "count", kind: "COUNT" }] },
  { id: "time", label: "Time of day", hint: "When it happened", icon: "Clock", hasDoneToggle: false, fields: [{ key: "time", kind: "TIME" }] },
  { id: "scale", label: "3-level scale", hint: "Low, medium, high", icon: "ChartBar", hasDoneToggle: false, fields: [{ key: "level", kind: "ICONSCALE" }] },
];

function Icon({ name, ...props }: { name: string } & IconProps) {
  const C = (Icons as unknown as Record<string, React.ComponentType<IconProps> | undefined>)[name] ?? Icons.Leaf;
  return createElement(C, props);
}

interface AddPracticeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddPracticeDialog({ open, onClose }: AddPracticeDialogProps) {
  const reduce = useReducedMotion();
  const [tab, setTab] = useState<"yours" | "library" | "custom">("yours");

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    const { overflow } = document.body.style;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-6" role="dialog" aria-modal="true" aria-label="Your practices">
          <motion.div
            className="absolute inset-0 bg-[rgba(24,22,15,0.36)]"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
          />
          <motion.div
            className="relative w-full sm:max-w-[620px] h-[92dvh] sm:h-[min(820px,88dvh)] flex flex-col bg-bg rounded-t-[24px] sm:rounded-[24px] shadow-[var(--shadow-lift)] overflow-hidden"
            initial={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 40, opacity: 0 }}
            transition={{ duration: 0.36, ease: [0.16, 1, 0.3, 1] }}
          >
            <span className="sm:hidden mx-auto mt-2.5 w-10 h-1 rounded-full bg-line" aria-hidden="true" />
            <header className="flex items-center justify-between gap-3 px-5 sm:px-6 pt-4 sm:pt-6">
              <h2 className="font-display text-[24px] font-semibold tracking-[-0.015em] text-ink">Your practices</h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close"
                className="press grid place-items-center w-9 h-9 rounded-full bg-surface text-ink-soft hover:text-ink"
              >
                <Icons.X size={16} />
              </button>
            </header>

            <div role="tablist" className="mx-5 sm:mx-6 mt-4 p-1 rounded-full bg-surface grid grid-cols-3">
              {(
                [
                  ["yours", "Yours"],
                  ["library", "Library"],
                  ["custom", "Create"],
                ] as const
              ).map(([id, label]) => (
                <button
                  key={id}
                  role="tab"
                  aria-selected={tab === id}
                  onClick={() => setTab(id)}
                  className={cn(
                    "relative h-9 rounded-full font-ui text-[13.5px] font-semibold transition-colors",
                    tab === id ? "text-ink" : "text-ink-soft hover:text-ink"
                  )}
                >
                  {tab === id && (
                    <motion.span layoutId="add-practice-tab" className="absolute inset-0 rounded-full bg-bg shadow-[var(--shadow-soft)]" transition={{ type: "spring", stiffness: 500, damping: 40 }} />
                  )}
                  <span className="relative">{label}</span>
                </button>
              ))}
            </div>

            <div className="flex-1 overflow-y-auto overscroll-contain px-5 sm:px-6 pt-4 pb-[max(24px,env(safe-area-inset-bottom))]">
              {tab === "yours" ? <YoursTab onAdd={() => setTab("library")} /> : tab === "library" ? <LibraryTab /> : <CustomTab onDone={() => setTab("yours")} />}
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}

function LibraryTab() {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: practices = [] } = usePractices();
  const [busyId, setBusyId] = useState<string | null>(null);

  // Which catalog entries this person already has, and the practice id for each.
  const owned = useMemo(() => {
    const m = new Map<string, string>();
    for (const p of practices) {
      const entry = catalogFor(p);
      if (entry) m.set(entry.id, p.id);
    }
    return m;
  }, [practices]);

  async function toggle(entry: CatalogPractice) {
    if (busyId) return;
    setBusyId(entry.id);
    try {
      const existing = owned.get(entry.id);
      const res = existing
        ? await fetch("/api/practices", {
            method: "DELETE",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ id: existing }),
          })
        : await fetch("/api/practices", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              name: entry.name,
              iconName: entry.icon,
              catalogId: entry.id,
              hasDoneToggle: entry.hasDoneToggle,
              fields: entry.fields,
            }),
          });
      if (!res.ok) throw new Error();
      await qc.invalidateQueries({ queryKey: keys.practices() });
      toast(existing ? `${entry.name} removed` : `${entry.name} added`, "success", 1800);
    } catch {
      toast("Couldn't update. Please try again.", "error");
    } finally {
      setBusyId(null);
    }
  }

  return <PracticeLibrary chosen={new Set(owned.keys())} onToggle={toggle} busyId={busyId} />;
}

function CustomTab({ onDone }: { onDone: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState<string>("Leaf");
  const [trackId, setTrackId] = useState("minutes");
  const [saving, setSaving] = useState(false);
  const track = TRACK_OPTIONS.find((t) => t.id === trackId)!;

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    try {
      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: name.trim(), iconName, hasDoneToggle: track.hasDoneToggle, fields: track.fields }),
      });
      if (!res.ok) throw new Error();
      await qc.invalidateQueries({ queryKey: keys.practices() });
      toast(`${name.trim()} added`, "success", 1800);
      onDone();
    } catch {
      toast("Couldn't add it. Please try again.", "error");
      setSaving(false);
    }
  }

  return (
    <form onSubmit={save}>
      <Busy busy={saving} className="flex flex-col gap-6">
      <label className="block">
        <span className="font-ui text-[13px] font-semibold text-ink">Name</span>
        <input
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="e.g. Pradakshina, evening walk, Gita reading"
          autoFocus
          className="mt-2 w-full h-12 px-4 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent transition-colors placeholder:text-ink-soft/80"
        />
      </label>

      <fieldset>
        <legend className="font-ui text-[13px] font-semibold text-ink mb-2">Icon</legend>
        <div className="grid grid-cols-8 gap-1.5 sm:gap-2.5">
          {ICON_OPTIONS.map((ico) => {
            const on = iconName === ico;
            return (
              <button
                key={ico}
                type="button"
                aria-label={ico}
                aria-pressed={on}
                onClick={() => setIconName(ico)}
                className={cn(
                  "press relative aspect-square rounded-[14px] grid place-items-center transition-all duration-200",
                  on ? "ring-[2.5px] ring-accent ring-offset-2 ring-offset-bg" : "opacity-85 hover:opacity-100"
                )}
              >
                <PaintedTile icon={ico} size={44} className="rounded-[12px] w-full h-full" />
                {on && (
                  <span className="absolute -top-1.5 -right-1.5 grid place-items-center w-5 h-5 rounded-full bg-accent text-bg text-[11px] font-serif leading-none shadow">✓</span>
                )}
              </button>
            );
          })}
        </div>
      </fieldset>

      <fieldset>
        <legend className="font-ui text-[13px] font-semibold text-ink mb-2">How to track it</legend>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
          {TRACK_OPTIONS.map((t) => (
            <button
              key={t.id}
              type="button"
              aria-pressed={trackId === t.id}
              onClick={() => setTrackId(t.id)}
              className={cn(
                "press flex items-center gap-3 p-3 rounded-[14px] text-left border transition-colors",
                trackId === t.id ? "bg-accent-soft border-accent/40" : "bg-surface border-transparent hover:bg-surface-2"
              )}
            >
              <span className={cn("grid place-items-center w-9 h-9 rounded-[10px] shrink-0", trackId === t.id ? "bg-accent text-bg" : "bg-bg text-ink-soft")}>
                <Icon name={t.icon} size={18} />
              </span>
              <span>
                <span className="block font-ui text-[14px] font-semibold text-ink">{t.label}</span>
                <span className="block font-ui text-[12.5px] text-ink-soft">{t.hint}</span>
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      <div>
        <span className="font-ui text-[13px] font-semibold text-ink">Preview</span>
        <div className="mt-2 flex items-center gap-3 p-3 rounded-[16px] bg-surface">
          <PracticeIcon name={name || "New practice"} iconName={iconName} />
          <span className="flex-1 min-w-0">
            <span className="block font-serif text-[16px] text-ink truncate">{name.trim() || "Your practice"}</span>
            <span className="block font-ui text-[12.5px] text-ink-soft">{describeTracking(track.fields, track.hasDoneToggle)}</span>
          </span>
        </div>
      </div>

      </Busy>
      <Button type="submit" size="lg" loading={saving} disabled={!name.trim()} className="w-full mt-6">
        Add practice
      </Button>
    </form>
  );
}

function YoursTab({ onAdd }: { onAdd: () => void }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const { data: practices = [], isLoading } = usePractices();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<Practice | null>(null);

  async function remove(p: Practice) {
    if (!confirm(`Remove ${p.name}? Days you've already logged stay as they are.`)) return;
    setBusyId(p.id);
    const res = await fetch("/api/practices", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id: p.id }) });
    if (!res.ok) toast("Couldn't remove. Please try again.", "error");
    else toast(`${p.name} removed`, "success", 1600);
    await qc.invalidateQueries({ queryKey: keys.practices() });
    setBusyId(null);
  }

  if (isLoading) return <div className="py-10 grid place-items-center"><ButtonLoader className="text-accent" /></div>;
  if (!practices.length) {
    return (
      <div className="py-10 text-center">
        <p className="font-ui text-[14px] text-ink-soft">No practices yet.</p>
        <button type="button" onClick={onAdd} className="press mt-3 font-ui text-[14px] font-semibold text-accent">Add from the library</button>
      </div>
    );
  }

  return (
    <>
      <p className="font-ui text-[13px] text-ink-soft mb-3">Tap a practice to rename it or change its usual values.</p>
      <ul className="flex flex-col gap-1.5">
        {practices.map((p) => {
          const spec = specFor(p);
          return (
            <li key={p.id} inert={busyId === p.id} aria-busy={busyId === p.id || undefined} className={cn("relative flex items-center gap-3 p-2.5 rounded-[16px] bg-surface transition-opacity", busyId === p.id && "opacity-60")}>
              {busyId === p.id && <BusyBar show className="absolute top-0 inset-x-4" />}
              <button type="button" onClick={() => setEditing(p)} className="flex flex-1 items-center gap-3 min-w-0 text-left">
                <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={44} className="rounded-[12px]" />
                <span className="min-w-0">
                  <span className="block font-ui text-[15px] font-semibold text-ink truncate">{p.name}</span>
                  <span className="block font-ui text-[12.5px] text-ink-soft truncate">{describeTracking(spec.fields, spec.hasDoneToggle) || "done"}</span>
                </span>
              </button>
              <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
                <Icons.Trash size={17} />
              </button>
            </li>
          );
        })}
      </ul>
      <button type="button" onClick={onAdd} className="press mt-4 inline-flex items-center gap-1.5 font-ui text-[14px] font-semibold text-accent">
        <Icons.Plus size={15} weight="bold" /> Add from the library
      </button>
      <PracticeEditor practice={editing} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}
