import { cn } from "@/lib/utils";

/** A thin travelling bar, shown along the top of a form while it saves. */
export function BusyBar({ show, className }: { show: boolean; className?: string }) {
  return (
    <div aria-hidden="true" className={cn("pointer-events-none h-[3px] overflow-hidden rounded-full transition-opacity duration-200", show ? "opacity-100" : "opacity-0", className)}>
      {show && <div className="ana-busy h-full w-1/3 rounded-full bg-accent" />}
    </div>
  );
}

/**
 * Wraps a form's fields. While busy the fields can't be edited (inert: no typing, clicking or
 * tabbing in), they dim slightly, and a loading bar runs along the top.
 */
export function Busy({ busy, children, className, bar = true }: { busy: boolean; children: React.ReactNode; className?: string; bar?: boolean }) {
  return (
    <div className={cn("relative", className)} aria-busy={busy || undefined}>
      {bar && <BusyBar show={busy} className="sticky top-0 z-10 -mt-[3px] mb-0" />}
      <div inert={busy} className={cn("transition-opacity duration-200", busy && "opacity-60 select-none")}>
        {children}
      </div>
    </div>
  );
}
