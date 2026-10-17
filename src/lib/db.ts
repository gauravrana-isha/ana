import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

/*
 * Neon's free plan sleeps the database after a few idle minutes, and waking it can take a
 * few seconds, longer than Prisma's default 5 s connect timeout. Give the first connection
 * room to wake it (unless the URL already says otherwise).
 */
function databaseUrl() {
  const url = process.env.DATABASE_URL;
  if (!url || /[?&]connect_timeout=/.test(url)) return url;
  return url + (url.includes("?") ? "&" : "?") + "connect_timeout=20";
}

export const db = globalForPrisma.prisma ?? new PrismaClient({ datasourceUrl: databaseUrl() });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
