"use client";

import { useState } from "react";
import { X } from "@phosphor-icons/react";
import { useQueryClient } from "@tanstack/react-query";
import { cn } from "@/lib/utils";
import { keys } from "@/lib/queries";

const TRACK_TYPES = [
  { id: "check", label: "Done / Not done", fields: [], hasDoneToggle: true },
  { id: "minutes", label: "Minutes", fields: [{ key: "min", kind: "MINUTES" as const }], hasDoneToggle: true },
  { id: "count", label: "Count", fields: [{ key: "count", kind: "COUNT" as const }], hasDoneToggle: true },
  { id: "time", label: "Time", fields: [{ key: "time", kind: "TIME" as const }], hasDoneToggle: false },
];

const ICON_OPTIONS = [
  "Heart", "Star", "Flower", "Sun", "Moon", "Lightning", "Fire",
  "Drop", "Mountains", "Tree", "Leaf", "Bird", "HandPalm", "Eye",
  "Brain", "Barbell", "Person", "Books", "PencilSimple", "Music",
];

interface AddPracticeDialogProps {
  open: boolean;
  onClose: () => void;
}

export function AddPracticeDialog({ open, onClose }: AddPracticeDialogProps) {
  const [name, setName] = useState("");
  const [iconName, setIconName] = useState("Star");
  const [trackType, setTrackType] = useState("check");
  const [saving, setSaving] = useState(false);
  const qc = useQueryClient();

  if (!open) return null;

  async function handleSave() {
    if (!name.trim()) return;
    setSaving(true);

    const chosen = TRACK_TYPES.find((t) => t.id === trackType)!;

    try {
      const res = await fetch("/api/practices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: name.trim(),
          iconName,
          hasDoneToggle: chosen.hasDoneToggle,
          fields: chosen.fields,
        }),
      });

      if (res.ok) {
        qc.invalidateQueries({ queryKey: keys.practices() });
        setName("");
        setIconName("Star");
        setTrackType("check");
        onClose();
      }
    } catch (e) {
      console.error("Failed to add practice:", e);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      {/* Dialog */}
      <div className="relative bg-surface rounded-20 p-6 w-full max-w-[380px] shadow-xl">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-ink-soft hover:text-ink"
          aria-label="Close"
        >
          <X size={20} weight="thin" />
        </button>

        <h2 className="font-hand text-2xl text-accent mb-4">Add a practice</h2>

        {/* Name */}
        <label className="font-ui text-xs text-ink-soft uppercase tracking-wider mb-1 block">
          Name
        </label>
        <input
          type="text"
          value={name}
          onChange={(e) => setName(e.target.value.slice(0, 50))}
          placeholder="e.g. Pradakshina"
          className="w-full px-3 py-2 rounded-[10px] border border-line bg-surface-2 text-ink font-serif text-base outline-none mb-4 placeholder:text-ink-soft placeholder:italic"
          maxLength={50}
          autoFocus
        />

        {/* Icon */}
        <label className="font-ui text-xs text-ink-soft uppercase tracking-wider mb-1 block">
          Icon
        </label>
        <div className="flex flex-wrap gap-1.5 mb-4">
          {ICON_OPTIONS.map((ico) => (
            <button
              key={ico}
              onClick={() => setIconName(ico)}
              className={cn(
                "w-8 h-8 rounded-lg grid place-items-center text-sm transition-all",
                iconName === ico
                  ? "bg-accent-soft text-accent ring-1 ring-accent"
                  : "text-ink-soft hover:text-ink"
              )}
              aria-label={ico}
            >
              {ico.charAt(0)}
            </button>
          ))}
        </div>

        {/* Track type */}
        <label className="font-ui text-xs text-ink-soft uppercase tracking-wider mb-1 block">
          How to track
        </label>
        <div className="space-y-1.5 mb-5">
          {TRACK_TYPES.map((t) => (
            <button
              key={t.id}
              onClick={() => setTrackType(t.id)}
              className={cn(
                "w-full text-left px-3 py-2.5 rounded-14 border transition-all font-ui text-sm",
                trackType === t.id
                  ? "border-accent text-accent bg-accent-soft"
                  : "border-line text-ink-soft hover:border-accent"
              )}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* Save */}
        <button
          onClick={handleSave}
          disabled={!name.trim() || saving}
          className="w-full py-3 rounded-14 bg-accent text-bg font-ui text-sm font-medium
                     disabled:opacity-40 disabled:cursor-not-allowed transition-opacity"
        >
          {saving ? "Saving…" : "Add practice"}
        </button>
      </div>
    </div>
  );
}
