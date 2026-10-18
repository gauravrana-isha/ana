"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { useWaiting } from "@/lib/waiting";
import { cn } from "@/lib/utils";

/** An ink ring, drawn by hand: nearly closed, the pen lifting where it began. */
export const RING_PATH = "M12.6 5.3c3.7.2 6.4 3.1 6.2 6.9-.2 3.6-3.2 6.5-6.9 6.4-3.6-.1-6.6-3.1-6.5-6.8.1-3 2.2-5.6 5.1-6.3";

/**
 * A quiet mark on something not yet in the journal: a hollow ink ring while it waits on this
 * phone, which fills with ink when it lands and then fades away. Refused, it stays, in red.
 * `id` is what the save marks (a moment's id, `daily:<date>`…; see lib/waiting).
 */
export function SyncMark({ id, size = 12, className }: { id: string | string[]; size?: number; className?: string }) {
  const { marks, refusedMarks } = useWaiting();
  const ids = Array.isArray(id) ? id : [id];
  const waiting = ids.some((x) => marks.has(x));
  const refused = !waiting && ids.some((x) => refusedMarks.has(x));
  const [landed, setLanded] = useState(false);
  const was = useRef(waiting);
  const reduce = useReducedMotion();

  useEffect(() => {
    const before = was.current;
    was.current = waiting;
    if (!before || waiting || refused) return;
    // Just sent: fill with ink, then go.
    setLanded(true);
    const t = setTimeout(() => setLanded(false), 1500);
    return () => clearTimeout(t);
  }, [waiting, refused]);

  const shown = waiting || landed || refused;
  return (
    <AnimatePresence>
      {shown && (
        <motion.span
          key="mark"
          role="img"
          aria-label={refused ? "Not accepted" : waiting ? "Kept on this phone, not sent yet" : "Sent"}
          title={refused ? "Not accepted" : waiting ? "Kept on this phone, not sent yet" : "Sent"}
          initial={{ opacity: 0, scale: reduce ? 1 : 0.6 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: reduce ? 1 : 0.8, transition: { duration: 0.35 } }}
          className={cn("inline-grid place-items-center shrink-0", refused ? "text-danger" : landed ? "text-accent" : "text-ink-soft", className)}
          style={{ width: size, height: size }}
        >
          <svg viewBox="0 0 24 24" width={size} height={size} fill="none" aria-hidden="true" className="overflow-visible">
            <motion.path
              d={RING_PATH}
              stroke="currentColor"
              strokeWidth={2.4}
              strokeLinecap="round"
              initial={{ pathLength: reduce ? 1 : 0 }}
              animate={{ pathLength: 1 }}
              transition={{ duration: 0.5, ease: "easeOut" }}
            />
            {landed && (
              <motion.circle
                cx="12"
                cy="12"
                r="5.2"
                fill="currentColor"
                initial={{ scale: 0, opacity: 0.4 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ type: "spring", stiffness: 260, damping: 18 }}
                style={{ transformOrigin: "12px 12px" }}
              />
            )}
          </svg>
        </motion.span>
      )}
    </AnimatePresence>
  );
}
