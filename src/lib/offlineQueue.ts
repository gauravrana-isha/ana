import { get, set } from "idb-keyval";

interface QueuedMutation {
  id: string;
  url: string;
  method: string;
  body: string;
  timestamp: number;
}

const QUEUE_KEY = "ana-offline-queue";
const MAX_QUEUE = 500;

export async function enqueue(mutation: Omit<QueuedMutation, "id" | "timestamp">) {
  const queue = (await get<QueuedMutation[]>(QUEUE_KEY)) ?? [];
  if (queue.length >= MAX_QUEUE) {
    throw new Error("Offline queue full");
  }
  queue.push({
    ...mutation,
    id: crypto.randomUUID(),
    timestamp: Date.now(),
  });
  await set(QUEUE_KEY, queue);
}

export async function flush(): Promise<{ synced: number; remaining: number }> {
  const queue = (await get<QueuedMutation[]>(QUEUE_KEY)) ?? [];
  const failed: QueuedMutation[] = [];

  for (const item of queue) {
    try {
      await fetch(item.url, {
        method: item.method,
        body: item.body,
        headers: { "Content-Type": "application/json" },
      });
    } catch {
      failed.push(item);
    }
  }

  await set(QUEUE_KEY, failed);
  return { synced: queue.length - failed.length, remaining: failed.length };
}

export async function getQueueSize(): Promise<number> {
  const queue = (await get<QueuedMutation[]>(QUEUE_KEY)) ?? [];
  return queue.length;
}

// Auto-flush when coming back online
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    flush().catch(console.error);
  });
}
