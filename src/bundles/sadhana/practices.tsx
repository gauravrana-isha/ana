"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { usePractices, keys } from "@/lib/queries";
import { useToast } from "@/components/ui/Toast";
import { useConfirm } from "@/components/ui/Confirm";
import { BusyBar } from "@/components/ui/Busy";
import { PracticeIcon } from "@/components/tracker/PracticeIcon";
import { AddPracticeDialog } from "@/components/tracker/AddPracticeDialog";
import { PracticeEditor } from "@/components/tracker/PracticeEditor";
import { DeleteMark, EditMark } from "@/components/art/PenMarks";
import { describeTracking } from "@/lib/practiceCatalog";
import { scaleLabel, specFor, time12 } from "@/lib/practiceSpec";
import { deletePractice } from "@/lib/journal";
import { cn } from "@/lib/utils";
import type { Practice } from "@/lib/types";

/*
 * Sadhana's practices: add from the library, edit, remove. Shown in Profile → Practices and
 * from "Edit practices" on the Sadhana page itself.
 */

export function PracticesPanel() {
  const { data: practices } = usePractices();
  const [libraryOpen, setLibraryOpen] = useState(false);
  const list: Practice[] = Array.isArray(practices) ? practices : [];
  return (
    <div className="flex flex-col gap-3">
      <ManagePractices practices={list} />
      <button type="button" onClick={() => setLibraryOpen(true)} className="press self-start inline-flex items-center gap-1.5 h-10 px-4 rounded-full bg-surface font-ui text-[13.5px] font-semibold text-accent hover:bg-surface-2">
        <EditMark size={17} /> Add or change practices
      </button>
      <AddPracticeDialog open={libraryOpen} onClose={() => setLibraryOpen(false)} />
    </div>
  );
}


function ManagePractices({ practices }: { practices: Practice[] }) {
  const qc = useQueryClient();
  const { toast } = useToast();
  const [editing, setEditing] = useState<Practice | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const ask = useConfirm();

  async function remove(p: Practice) {
    if (!(await ask({ title: `Remove ${p.name}?`, body: "Days you've already logged stay as they are.", confirmLabel: "Remove", tone: "danger" }))) return;
    setBusyId(p.id);
    try {
      await deletePractice(p.id);
      toast(`${p.name} removed`, "success", 1800);
    } catch {
      toast("Couldn't remove. Please try again.", "error");
    }
    void qc.invalidateQueries({ queryKey: keys.practices() });
    setBusyId(null);
  }

  if (practices.length === 0) return <p className="font-ui text-[14px] text-ink-soft">No practices yet. Add some from the library.</p>;

  return (
    <>
      <ul className="rounded-[18px] bg-surface divide-y divide-line">
        {practices.map((p) => (
          <li key={p.id} inert={busyId === p.id} aria-busy={busyId === p.id || undefined} className={cn("relative flex items-center gap-3 px-3 py-2.5 transition-opacity", busyId === p.id && "opacity-60")}>
            {busyId === p.id && <BusyBar show className="absolute top-0 inset-x-3" />}
            <button type="button" onClick={() => setEditing(p)} className="flex flex-1 items-center gap-3 min-w-0 text-left rounded-[10px]">
              <PracticeIcon name={p.name} iconName={p.iconName} catalogId={p.catalogId} size={36} />
              <span className="flex-1 min-w-0">
                <span className="block font-ui text-[14.5px] font-semibold text-ink truncate">{p.name}</span>
                <span className="block font-ui text-[12.5px] text-ink-soft truncate">{practiceSummary(p)}</span>
              </span>
            </button>
            <button type="button" aria-label={`Edit ${p.name}`} onClick={() => setEditing(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-ink hover:bg-surface-2">
              <EditMark size={19} />
            </button>
            <button type="button" aria-label={`Remove ${p.name}`} onClick={() => remove(p)} className="press grid place-items-center w-9 h-9 rounded-full text-ink-soft hover:text-danger hover:bg-danger/10">
              <DeleteMark size={19} />
            </button>
          </li>
        ))}
      </ul>
      <PracticeEditor practice={editing} open={!!editing} onClose={() => setEditing(null)} />
    </>
  );
}

/** One short line: "time of day · default 4:30 am", "minutes · fills 15 min", "1–2× + kapalbhati · fills 1×, 108". */
function practiceSummary(p: Practice) {
  const spec = specFor(p);
  const what = describeTracking(spec.fields, spec.hasDoneToggle) || "done";
  const usual = spec.fields
    .map((f) => {
      const v = spec.rhythm ? f.default : f.fill;
      if (v === undefined || v === "" || v === 0) return null;
      if (f.kind === "TIME") return time12(v);
      if (f.kind === "ICONSCALE") return scaleLabel(f, v);
      if (f.taps) return `${v}×`;
      // A named count is already named in the first half ("kapalbhati"), so just its number.
      return f.kind === "MINUTES" ? `${v} min` : String(v);
    })
    .filter(Boolean);
  return usual.length ? `${what} · ${spec.rhythm ? "default" : "fills"} ${usual.join(", ")}` : what;
}

