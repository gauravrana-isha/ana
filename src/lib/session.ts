import { cookies } from "next/headers";
import { db } from "./db";

/**
 * Resolve the current user from the device cookie.
 * Returns the user or null.
 */
export async function resolveUser() {
  const cookieStore = await cookies();
  const deviceId = cookieStore.get("ana-device-id")?.value;

  if (deviceId) {
    const user = await db.user.findUnique({ where: { deviceId } });
    if (user) return user;
  }

  return null;
}

/**
 * Get or create an anonymous user from the device cookie.
 * Called during onboarding to bootstrap the user.
 */
export async function getOrCreateDeviceUser(): Promise<{ userId: string; deviceId: string; isNew: boolean }> {
  const cookieStore = await cookies();
  const existingDeviceId = cookieStore.get("ana-device-id")?.value;

  if (existingDeviceId) {
    const existing = await db.user.findUnique({ where: { deviceId: existingDeviceId } });
    if (existing) return { userId: existing.id, deviceId: existingDeviceId, isNew: false };
  }

  // Generate a new device ID and create user
  const deviceId = crypto.randomUUID();

  const user = await db.user.create({
    data: { deviceId },
  });

  // Set the cookie (expires in 1 year)
  cookieStore.set("ana-device-id", deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });

  return { userId: user.id, deviceId, isNew: true };
}
