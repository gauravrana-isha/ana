"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Check, MagnifyingGlass, Plus, X } from "@phosphor-icons/react";
import { CATALOG, COMMON_IDS, KIND_LABEL, catalogImage, type CatalogPractice } from "@/lib/practiceCatalog";
import { cn } from "@/lib/utils";
import { ButtonLoader } from "@/components/ui/Loader";
import { PracticeIcon } from "./PracticeIcon";

interface PracticeLibraryProps {
  /** Catalog ids currently chosen / added. */
  chosen: Set<string>;
  onToggle: (entry: CatalogPractice) => void;
  /** Catalog id currently being saved, to show a loader on its button. */
  busyId?: string | null;
  /** "add" shows Add / Added buttons (tracker); "select" shows ticks (onboarding). */
  mode?: "add" | "select";
  className?: string;
}

function meta(e: CatalogPractice) {
  return [e.minutes ? `${e.minutes} min` : null, KIND_LABEL[e.kind]].filter(Boolean).join(" · ");
}

export function PracticeLibrary({ chosen, onToggle, busyId, mode = "add", className }: PracticeLibraryProps) {
  const [query, setQuery] = useState("");

  const sections = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (q) {
      const hits = CATALOG.filter((c) => c.name.toLowerCase().includes(q) || c.aliases?.some((a) => a.toLowerCase().includes(q)));
      return [{ title: hits.length ? `${hits.length} found` : "Nothing found", items: hits }];
    }
    const common = COMMON_IDS.map((id) => CATALOG.find((c) => c.id === id)!).filter(Boolean);
    const rhythm = CATALOG.filter((c) => c.kind === "rhythm");
    const rest = CATALOG.filter((c) => c.kind !== "rhythm" && !COMMON_IDS.includes(c.id)).sort((a, b) =>
      a.name.localeCompare(b.name)
    );
    return [
      { title: "Commonly practiced", items: common },
      { title: "Daily rhythm", items: rhythm },
      { title: "All practices", items: rest },
    ];
  }, [query]);

  return (
    <div className={className}>
      <label className="relative block">
        <span className="sr-only">Search practices</span>
        <MagnifyingGlass size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-ink-soft pointer-events-none" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search 52 practices"
          className="w-full h-12 pl-11 pr-10 rounded-[14px] bg-surface-2 text-ink font-ui text-[16px] outline-none border border-transparent focus:border-accent transition-colors placeholder:text-ink-soft/80 [&::-webkit-search-cancel-button]:hidden"
        />
        {query && (
          <button
            type="button"
            onClick={() => setQuery("")}
            aria-label="Clear search"
            className="absolute right-2 top-1/2 -translate-y-1/2 grid place-items-center w-8 h-8 rounded-full text-ink-soft hover:bg-surface"
          >
            <X size={16} />
          </button>
        )}
      </label>

      {sections.map((section) => (
        <section key={section.title} className="mt-6">
          <h3 className="font-ui text-[13px] font-semibold text-ink-soft mb-2 px-1">{section.title}</h3>
          <ul className="flex flex-col gap-1.5">
            {section.items.map((entry) => {
              const on = chosen.has(entry.id);
              const img = catalogImage(entry);
              return (
                <li key={entry.id}>
                  <button
                    type="button"
                    aria-pressed={on}
                    onClick={() => onToggle(entry)}
                    className={cn(
                      "press w-full flex items-center gap-3 p-2.5 pr-3 rounded-[16px] text-left transition-colors",
                      on ? "bg-accent-soft" : "bg-surface hover:bg-surface-2"
                    )}
                  >
                    {img ? (
                      <Image src={img} alt="" width={48} height={48} unoptimized={img.endsWith(".svg")} className="rounded-[12px] shrink-0 bg-surface-2" />
                    ) : (
                      <PracticeIcon name={entry.name} iconName={entry.icon} catalogId={entry.id} size={48} className="rounded-[12px]" />
                    )}
                    <span className="flex-1 min-w-0">
                      <span className="block font-ui text-[15px] font-semibold text-ink leading-tight">{entry.name}</span>
                      <span className="block font-ui text-[13px] text-ink-soft mt-0.5">{meta(entry)}</span>
                    </span>
                    {mode === "add" ? (
                      <span
                        className={cn(
                          "inline-flex items-center justify-center gap-1 h-9 min-w-[84px] px-3 rounded-[11px] font-ui text-[13px] font-semibold transition-colors",
                          on ? "bg-accent text-bg" : "border border-accent/40 text-accent"
                        )}
                      >
                        {busyId === entry.id ? (
                          <ButtonLoader />
                        ) : on ? (
                          <>
                            <Check size={14} weight="bold" /> Added
                          </>
                        ) : (
                          <>
                            <Plus size={14} weight="bold" /> Add
                          </>
                        )}
                      </span>
                    ) : (
                      <span
                        aria-hidden="true"
                        className={cn(
                          "grid place-items-center w-6 h-6 rounded-full shrink-0 transition-all duration-200",
                          on ? "bg-accent text-bg" : "border-[1.5px] border-line bg-bg"
                        )}
                      >
                        {on && <Check size={13} weight="bold" />}
                      </span>
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </section>
      ))}
    </div>
  );
}
