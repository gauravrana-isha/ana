"use client";

/** What browsers say when a request couldn't reach the server at all. */
const NETWORK = /Failed to fetch|NetworkError|Load failed|network connection was lost|no answer from storage|ERR_INTERNET_DISCONNECTED/i;

/** Tell the admins something failed (technical details only, never journal content). */
export function reportError(source: string, error: unknown, extra?: string) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    // Being offline (or the connection dropping) isn't a fault: ana is made to work that way.
    if (!navigator.onLine || NETWORK.test(e.message)) return;
    // Next.js moves pages along by throwing (redirect, notFound): those are its way, not faults.
    const digest = (error as { digest?: string })?.digest ?? "";
    if (/^NEXT_(REDIRECT|NOT_FOUND|HTTP_ERROR_FALLBACK)/.test(digest) || /^NEXT_REDIRECT/.test(e.message)) return;
    const body = JSON.stringify({
      source,
      message: (extra ? `${e.message} · ${extra}` : e.message).slice(0, 2000),
      stack: e.stack?.slice(0, 4000),
      path: location.pathname,
      digest: digest || undefined,
    });
    fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* reporting must never break anything */
  }
}
