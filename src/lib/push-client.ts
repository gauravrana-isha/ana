"use client";

import { useCallback, useEffect, useState } from "react";

/*
 * Notifications on this device (Web Push). The browser holds the subscription; the server
 * keeps a copy per device so reminders can be sent when the app is closed.
 */

export type PushState =
  | "loading"
  | "unsupported" // no service worker / push in this browser
  | "needs-install" // iPhone/iPad: push only works once added to the Home Screen
  | "unconfigured" // server has no keys yet
  | "denied" // the person blocked notifications for this site
  | "off"
  | "on";

const VAPID = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY ?? "";

function isIOS() {
  return /iPad|iPhone|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
}

function standalone() {
  return window.matchMedia("(display-mode: standalone)").matches || (navigator as { standalone?: boolean }).standalone === true;
}

function keyBytes(base64: string) {
  const pad = "=".repeat((4 - (base64.length % 4)) % 4);
  const raw = atob((base64 + pad).replace(/-/g, "+").replace(/_/g, "/"));
  return Uint8Array.from(raw, (c) => c.charCodeAt(0));
}

async function registration() {
  // Production registers the worker on load; development only when notifications are wanted.
  return (await navigator.serviceWorker.getRegistration()) ?? (await navigator.serviceWorker.register("/sw.js"));
}

async function currentState(): Promise<PushState> {
  if (!("serviceWorker" in navigator) || !("Notification" in window)) return isIOS() && !standalone() ? "needs-install" : "unsupported";
  if (!("PushManager" in window)) return isIOS() && !standalone() ? "needs-install" : "unsupported";
  if (!VAPID) return "unconfigured";
  if (Notification.permission === "denied") return "denied";
  const reg = await navigator.serviceWorker.getRegistration();
  const sub = await reg?.pushManager.getSubscription();
  return sub && Notification.permission === "granted" ? "on" : "off";
}

async function save(sub: PushSubscription) {
  const res = await fetch("/api/push", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ subscription: sub.toJSON(), timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone }),
  });
  if (!res.ok) throw new Error((await res.json().catch(() => null))?.error ?? "Couldn't turn on notifications");
}

// Every mounted hook hears about changes made by any other.
const listeners = new Set<() => void>();
const changed = () => listeners.forEach((l) => l());

export function usePush() {
  const [state, setState] = useState<PushState>("loading");
  const [busy, setBusy] = useState(false);

  const refresh = useCallback(() => {
    currentState().then(setState, () => setState("unsupported"));
  }, []);

  useEffect(() => {
    listeners.add(refresh);
    refresh();
    return () => {
      listeners.delete(refresh);
    };
  }, [refresh]);

  // Keep the server's copy fresh (browsers rotate subscriptions; time zones change with travel).
  useEffect(() => {
    if (state !== "on") return;
    navigator.serviceWorker.getRegistration().then((reg) => reg?.pushManager.getSubscription()).then((sub) => sub && save(sub).catch(() => {}));
  }, [state]);

  const enable = useCallback(async () => {
    setBusy(true);
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        changed();
        return false;
      }
      const reg = await registration();
      await navigator.serviceWorker.ready;
      const sub = (await reg.pushManager.getSubscription()) ?? (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: keyBytes(VAPID) }));
      await save(sub);
      changed();
      return true;
    } finally {
      setBusy(false);
    }
  }, []);

  const disable = useCallback(async () => {
    setBusy(true);
    try {
      const reg = await navigator.serviceWorker.getRegistration();
      const sub = await reg?.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
        await sub.unsubscribe();
      }
      changed();
    } finally {
      setBusy(false);
    }
  }, []);

  const test = useCallback(async () => {
    const res = await fetch("/api/push/test", { method: "POST" });
    return res.ok ? ((await res.json()) as { delivered: number }).delivered : 0;
  }, []);

  return { state, busy, enable, disable, test };
}

/** Forget this device's subscription locally (used on sign-out so the next person doesn't get these reminders). */
export async function dropPushSubscription() {
  try {
    const reg = await navigator.serviceWorker?.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch("/api/push", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  } catch {
    /* nothing to drop */
  }
}
