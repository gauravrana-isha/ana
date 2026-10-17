"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { Ornament } from "@/components/art/Ornament";
import { BackMark } from "@/components/art/PenMarks";

/** A page that isn't there: said plainly, with the way home and the way back. */
export function NotFound({ fullScreen = false }: { fullScreen?: boolean }) {
  const router = useRouter();
  return (
    <main className={fullScreen ? "min-h-dvh grid place-items-center px-6 py-12 bg-bg" : "grid place-items-center min-h-[70dvh] py-12"}>
      <div className="w-full max-w-[420px] text-center">
        <Lotus size={48} className="mx-auto text-accent" />
        <Ornament name="kolam" width={150} className="mx-auto mt-4 text-accent/50" />
        <p className="mt-6 font-ui text-[13px] font-semibold tracking-[0.08em] text-ink-soft tabular">404</p>
        <h1 className="mt-2 font-display text-[30px] font-semibold tracking-[-0.02em] text-ink leading-[1.15]">This page isn&rsquo;t here</h1>
        <p className="mt-3 font-ui text-[15px] leading-[1.65] text-ink-soft text-pretty">
          It may have moved, or the link has a small mistake. Your journal is just as you left it.
        </p>
        <div className="mt-8 flex flex-wrap items-center justify-center gap-2.5">
          <Link href="/today" className="press inline-flex items-center h-11 px-5 rounded-full bg-accent text-bg font-ui text-[14.5px] font-semibold hover:bg-accent/90">
            Go to Today
          </Link>
          <button
            type="button"
            onClick={() => (window.history.length > 1 ? router.back() : router.push("/today"))}
            className="press inline-flex items-center gap-1.5 h-11 px-5 rounded-full bg-surface text-ink font-ui text-[14.5px] font-semibold hover:bg-surface-2"
          >
            <BackMark size={16} /> Go back
          </button>
        </div>
      </div>
    </main>
  );
}
