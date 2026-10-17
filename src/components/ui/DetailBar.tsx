"use client";

import { useRouter } from "next/navigation";
import { BackMark, DeleteMark, EditMark } from "@/components/art/PenMarks";
import { cn } from "@/lib/utils";

/** The round buttons, on a soft blur so they read over photos and text. */
export const FLOAT_BUTTON =
  "press grid place-items-center w-10 h-10 rounded-full bg-bg/90 backdrop-blur-xl border border-line/70 text-ink-soft shadow-[0_1px_3px_rgb(0_0_0/0.06)] hover:text-ink hover:bg-surface";

/**
 * The top of a full-page view (a moment, a person): back, Edit and Delete, floating and
 * staying in reach while reading. Only two things to do, so both are out in the open:
 * icons on phones, labelled from sm up. Back returns to where you came from, else `backTo`.
 */
export function DetailBar({
  backTo,
  backLabel,
  onEdit,
  onDelete,
  what,
  deleteWord = "Delete",
}: {
  backTo: string;
  backLabel: string;
  onEdit: () => void;
  onDelete: () => void;
  /** For screen readers: "moment", "person". */
  what: string;
  deleteWord?: string;
}) {
  const router = useRouter();
  const back = () => (window.history.length > 1 ? router.back() : router.push(backTo));
  return (
    <div className="sticky top-[max(12px,calc(var(--safe-top)+6px))] lg:top-6 z-20 -mx-1 mb-4 flex items-center justify-between pointer-events-none">
      <button type="button" onClick={back} aria-label={backLabel} className={cn(FLOAT_BUTTON, "pointer-events-auto")}>
        <BackMark size={18} />
      </button>
      <div className="flex items-center gap-2 pointer-events-auto">
        <button type="button" onClick={onEdit} aria-label={`Edit ${what}`} className={cn(FLOAT_BUTTON, "sm:w-auto sm:px-4 sm:gap-1.5 sm:flex sm:text-accent")}>
          <EditMark size={19} />
          <span className="hidden sm:inline font-ui text-[14px] font-semibold">Edit</span>
        </button>
        <button type="button" onClick={onDelete} aria-label={`${deleteWord} ${what}`} className={cn(FLOAT_BUTTON, "sm:w-auto sm:px-4 sm:gap-1.5 sm:flex hover:text-danger")}>
          <DeleteMark size={19} />
          <span className="hidden sm:inline font-ui text-[14px] font-semibold">{deleteWord}</span>
        </button>
      </div>
    </div>
  );
}
