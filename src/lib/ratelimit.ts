import "server-only";
import { db } from "./db";

/*
 * Simple fixed-window rate limits, counted in the database (works across serverless
 * instances). Old windows are swept now and then.
 */

/** True if this key may make another request in the current window. */
export async function allow(key: string, limit: number, windowSec = 60) {
  const now = Date.now();
  const window = new Date(Math.floor(now / (windowSec * 1000)) * windowSec * 1000);
  const row = await db.rateLimit.upsert({
    where: { key_window: { key, window } },
    create: { key, window },
    update: { count: { increment: 1 } },
    select: { count: true },
  });
  // Roughly one request in fifty clears windows older than an hour.
  if (Math.random() < 0.02) db.rateLimit.deleteMany({ where: { window: { lt: new Date(now - 3_600_000) } } }).catch(() => {});
  return row.count <= limit;
}
