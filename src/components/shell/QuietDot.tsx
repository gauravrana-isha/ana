"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useWaitingCount } from "@/lib/waiting";
import { cn } from "@/lib/utils";

/**
 * A quiet sign that something is kept on this phone and not yet in the journal: a small ink
 * dot on the profile picture or the More tab. Never an alarm; it goes once everything is sent.
 */
export function QuietDot({ className }: { className?: string }) {
  const count = useWaitingCount();
  return (
    <AnimatePresence>
      {count > 0 && (
        <motion.span
          key="dot"
          role="img"
          aria-label={`${count} waiting to send`}
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          exit={{ scale: 0 }}
          transition={{ type: "spring", stiffness: 500, damping: 30 }}
          className={cn("absolute w-2 h-2 rounded-full bg-accent ring-2 ring-[var(--nav)] pointer-events-none", className)}
        />
      )}
    </AnimatePresence>
  );
}
