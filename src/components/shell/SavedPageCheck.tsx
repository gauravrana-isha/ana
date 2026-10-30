"use client";

import { useEffect } from "react";

/**
 * A screen opens from the copy saved on this device, while the service worker asks the server
 * for it again. If the server no longer shows it (signed out, not approved, a section switched
 * off), the worker drops the copy and says so here, and the page loads again from the server.
 */
export function SavedPageCheck() {
  useEffect(() => {
    const worker = navigator.serviceWorker?.controller;
    if (!worker) return;
    const path = location.pathname;
    const channel = new MessageChannel();
    channel.port1.onmessage = (e: MessageEvent<{ gone?: boolean }>) => {
      if (e.data?.gone && location.pathname === path) location.reload();
    };
    worker.postMessage({ type: "fresh?", path }, [channel.port2]);
    return () => channel.port1.close();
  }, []);
  return null;
}
