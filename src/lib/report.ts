"use client";

/** Tell the admins something failed (technical details only, never journal content). */
export function reportError(source: string, error: unknown, extra?: string) {
  try {
    const e = error instanceof Error ? error : new Error(String(error));
    const body = JSON.stringify({
      source,
      message: (extra ? `${e.message} · ${extra}` : e.message).slice(0, 2000),
      stack: e.stack?.slice(0, 4000),
      path: location.pathname,
      digest: (error as { digest?: string })?.digest,
    });
    fetch("/api/errors", { method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true }).catch(() => {});
  } catch {
    /* reporting must never break anything */
  }
}
