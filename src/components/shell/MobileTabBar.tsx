"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import {
  ListChecks,
  Compass,
  CalendarBlank,
  NotePencil,
  GearSix,
} from "@phosphor-icons/react";
import { cn } from "@/lib/utils";

const NAV = [
  { href: "/tracker", label: "Tracker", icon: ListChecks },
  { href: "/daily", label: "Daily", icon: Compass },
  { href: "/weekly", label: "Weekly", icon: CalendarBlank },
  { href: "/expressions", label: "Write", icon: NotePencil },
  { href: "/settings", label: "Settings", icon: GearSix },
];

export function MobileTabBar() {
  const pathname = usePathname();

  return (
    <nav
      className="fixed bottom-0 inset-x-0 h-[72px] bg-nav border-t border-line
                 flex items-center justify-around px-2 z-10 lg:hidden pb-safe"
      aria-label="Main navigation"
    >
      {NAV.map((n) => {
        const isActive = pathname === n.href;
        const Icon = n.icon;

        return (
          <Link
            key={n.href}
            href={n.href}
            className="relative flex flex-col items-center flex-1 pt-2"
            aria-current={isActive ? "page" : undefined}
          >
            {/* Icon with pop animation */}
            <motion.div
              animate={isActive ? { scale: 1 } : { scale: 1 }}
              className="relative z-[1]"
            >
              <AnimatePresence mode="wait">
                {isActive ? (
                  <motion.div
                    key="filled"
                    initial={{ scale: 0.5, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.5, opacity: 0 }}
                    transition={{ type: "spring", stiffness: 500, damping: 25, duration: 0.25 }}
                  >
                    <Icon size={26} weight="fill" className="text-accent" />
                  </motion.div>
                ) : (
                  <motion.div
                    key="thin"
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    exit={{ scale: 0.8, opacity: 0 }}
                    transition={{ duration: 0.15 }}
                  >
                    <Icon size={24} weight="thin" className="text-ink-soft" />
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Label */}
            <span
              className={cn(
                "font-ui text-[10px] mt-1 transition-colors duration-150",
                isActive ? "text-accent font-medium" : "text-ink-soft"
              )}
            >
              {n.label}
            </span>

            {/* Active dot indicator */}
            {isActive && (
              <motion.div
                layoutId="tab-dot"
                className="absolute -bottom-0.5 w-1 h-1 rounded-full bg-accent"
                transition={{ type: "spring", stiffness: 500, damping: 30 }}
              />
            )}
          </Link>
        );
      })}
    </nav>
  );
}
