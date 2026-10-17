"use client";

import { useEffect } from "react";
import { Lotus } from "@/components/art/Lotus";
import { reportError } from "@/lib/report";

/** Something broke on this screen: said plainly, reported to the admins, with a way to try again. */
export function ErrorScreen({ error, reset, fullScreen = false }: { error: Error & { digest?: string }; reset: () => void; fullScreen?: boolean }) {
  useEffect(() => {
    reportError(fullScreen ? "app-crash" : "screen-crash", error);
  }, [error, fullScreen]);
  return (
    <main className={fullScreen ? "min-h-dvh grid place-items-center px-6 py-12 bg-bg" : "grid place-items-center min-h-[70dvh] py-12"}>
      <div className="w-full max-w-[420px] text-center">
        <Lotus size={48} className="mx-auto text-accent" />
        <h1 className="mt-6 font-display text-[30px] font-semibold tracking-[-0.02em] text-ink leading-[1.15]">Something went wrong here</h1>
        <p className="mt-3 font-ui text-[15px] leading-[1.65] text-ink-soft text-pretty">
          It&rsquo;s been noted so it can be fixed. Your journal is safe; try this screen again.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <button type="button" onClick={reset} className="press inline-flex items-center h-11 px-5 rounded-full bg-accent text-bg font-ui text-[14.5px] font-semibold hover:bg-accent/90">
            Try again
          </button>
          <a href="/today" className="press inline-flex items-center h-11 px-5 rounded-full bg-surface text-ink font-ui text-[14.5px] font-semibold hover:bg-surface-2">
            Go to Today
          </a>
        </div>
      </div>
    </main>
  );
}
