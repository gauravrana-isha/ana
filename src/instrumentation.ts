/*
 * Server errors go to the admins' error log (Access → recent errors): what failed and
 * where, never request bodies or anything from a journal.
 */
export async function register() {}

export async function onRequestError(
  error: unknown,
  request: { path: string; method: string },
  context: { routePath: string; routeType: string }
) {
  if (process.env.NEXT_RUNTIME !== "nodejs") return;
  try {
    const { db } = await import("./lib/db");
    const e = error instanceof Error ? error : new Error(String(error));
    await db.errorLog.create({
      data: {
        source: `server-${context.routeType}`,
        message: `${request.method} ${context.routePath}: ${e.message}`.slice(0, 2000),
        stack: e.stack?.slice(0, 4000),
        path: request.path.split("?")[0].slice(0, 300),
        digest: (error as { digest?: string }).digest,
      },
    });
  } catch {
    /* logging must never make things worse */
  }
}
