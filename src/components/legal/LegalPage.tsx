import Link from "next/link";
import { BrandMark } from "@/components/art/BrandMark";
import { getCurrentUser, homeFor } from "@/lib/session";

/** Who runs ana, and how to reach them: the same on every legal page. */
export const OPERATOR = "Gaurav Rana";
export const CONTACT = "grana4175@gmail.com";

/**
 * A page of plain words (terms, privacy): the ana mark, a title, a short summary, then numbered
 * sections. Readable by anyone: signed out, the header offers Sign in; signed in, it leads back into ana.
 */
export async function LegalPage({ title, summary, children }: { title: string; summary: React.ReactNode; children: React.ReactNode }) {
  const user = await getCurrentUser();
  return (
    <div className="min-h-dvh bg-bg text-ink">
      <header className="sticky top-0 z-30 bg-bg/85 backdrop-blur-md border-b border-line/70 pt-[env(safe-area-inset-top)]">
        <div className="mx-auto max-w-[760px] px-5 sm:px-8 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2 text-accent" aria-label="ana">
            <BrandMark size={28} />
            <span className="font-display text-[24px] font-semibold text-ink leading-none">ana</span>
          </Link>
          <Link href={user ? homeFor(user) : "/login"} className="press inline-flex h-10 items-center px-4 rounded-full border border-line font-ui text-[14px] font-semibold text-ink hover:bg-surface">
            {user ? "Open ana" : "Sign in"}
          </Link>
        </div>
      </header>
      <main className="mx-auto max-w-[760px] px-5 sm:px-8 pt-12 pb-20">
        <h1 className="font-display text-[clamp(34px,6vw,48px)] font-semibold tracking-[-0.02em] leading-[1.08]">{title}</h1>
        <div className="mt-8 rounded-[22px] bg-surface px-6 py-5 font-serif text-[17px] leading-[1.65] text-ink">{summary}</div>
        <div className="legal mt-10">{children}</div>
      </main>
      <footer className="border-t border-line/70">
        <div className="mx-auto max-w-[760px] px-5 sm:px-8 py-10 flex flex-col sm:flex-row gap-4 sm:items-center justify-between">
          <p className="font-serif italic text-[15px] text-ink-soft">Just here and now</p>
          <nav aria-label="Legal" className="flex flex-wrap items-center gap-x-5 gap-y-2 font-ui text-[14px] font-medium text-ink-soft">
            <Link href="/terms" className="hover:text-ink">Terms</Link>
            <Link href="/privacy" className="hover:text-ink">Privacy</Link>
          </nav>
        </div>
      </footer>
    </div>
  );
}

/** A numbered section of a legal page. */
export function Section({ n, title, children }: { n: number; title: string; children: React.ReactNode }) {
  return (
    <section id={`s${n}`} className="scroll-mt-24 pt-8 first:pt-0">
      <h2 className="font-display text-[22px] sm:text-[24px] font-semibold tracking-[-0.01em]">
        <span className="text-accent tabular mr-2">{n}.</span>
        {title}
      </h2>
      <div className="mt-3 flex flex-col gap-3 font-ui text-[15.5px] leading-[1.7] text-ink">{children}</div>
    </section>
  );
}

export function Mail() {
  return (
    <a href={`mailto:${CONTACT}`} className="text-accent font-semibold underline underline-offset-2">
      {CONTACT}
    </a>
  );
}
