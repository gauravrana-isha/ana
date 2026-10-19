"use client";

import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Portal } from "@/components/ui/Portal";
import { ButtonLoader } from "@/components/ui/Loader";
import { EditMark } from "@/components/art/PenMarks";
import { Glyph } from "@/components/art/Glyphs";

/**
 * The one floating button for a reflection, Daily and Weekly alike, always in the same corner:
 * a pen while reading (tap to change it), a ✓ while changing (tap to save), with a small
 * Cancel beside it. Nothing pinned across the bottom of the screen.
 */
export function EditSaveFab({ editing, saving = false, onEdit, onSave, onCancel }: { editing: boolean; saving?: boolean; onEdit: () => void; onSave: () => void; onCancel: () => void }) {
  const reduce = useReducedMotion();
  return (
    <Portal>
      <div className="ana-fab fixed bottom-[calc(80px+env(safe-area-inset-bottom))] right-6 lg:bottom-8 lg:right-8 z-20 flex items-center gap-2.5">
        <AnimatePresence>
          {editing && (
            <motion.button
              key="cancel"
              type="button"
              onClick={onCancel}
              disabled={saving}
              initial={{ opacity: 0, x: reduce ? 0 : 12 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: reduce ? 0 : 12 }}
              className="press h-10 px-4 rounded-full bg-surface border border-line font-ui text-[13.5px] font-semibold text-ink-soft shadow-[var(--shadow-soft)] disabled:opacity-50"
            >
              Cancel
            </motion.button>
          )}
        </AnimatePresence>
        <button
          type="button"
          onClick={editing ? onSave : onEdit}
          disabled={saving}
          aria-label={editing ? "Save reflection" : "Edit reflection"}
          className="press w-12 h-12 rounded-full bg-accent text-bg grid place-items-center shadow-[0_6px_16px_var(--accent-soft)] disabled:opacity-60"
        >
          <AnimatePresence mode="wait" initial={false}>
            <motion.span
              key={saving ? "busy" : editing ? "save" : "edit"}
              initial={{ opacity: 0, scale: reduce ? 1 : 0.6, rotate: reduce ? 0 : -30 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              exit={{ opacity: 0, scale: reduce ? 1 : 0.6, rotate: reduce ? 0 : 30 }}
              transition={{ duration: 0.16 }}
              className="grid place-items-center"
            >
              {saving ? <ButtonLoader /> : editing ? <Glyph k="save" size={24} /> : <EditMark size={24} />}
            </motion.span>
          </AnimatePresence>
        </button>
      </div>
    </Portal>
  );
}
