import { cache } from "react";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { db } from "./db";
import { effectiveFeatures, featureByKey, type FeatureKey } from "./features";

/**
 * The signed-in user with their feature rows, whatever their status.
 * Cached per request so layouts, pages and guards share one lookup.
 */
export const getCurrentUser = cache(async () => {
  const session = await auth();
  const id = session?.user?.id;
  if (!id) return null;
  const user = await db.user.findUnique({ where: { id }, include: { features: true } });
  if (!user) return null;
  return { ...user, effective: effectiveFeatures(user.features) };
});

export type CurrentUser = NonNullable<Awaited<ReturnType<typeof getCurrentUser>>>;

/**
 * For API routes: the approved user, optionally required to have a feature.
 * Returns null when signed out, not yet approved, suspended, or without access,
 * so routes respond exactly as they do for a signed-out visitor.
 */
export async function resolveUser(feature?: FeatureKey) {
  const user = await getCurrentUser();
  if (!user || user.status !== "APPROVED") return null;
  if (feature && !user.effective.includes(feature)) return null;
  return user;
}

export async function resolveAdmin() {
  const user = await resolveUser();
  return user?.role === "ADMIN" ? user : null;
}

/** Where a user belongs right now, given their progress through sign-up. */
export function homeFor(user: CurrentUser | null): string {
  if (!user) return "/login";
  if (!user.onboardedAt) return "/onboarding";
  if (user.status !== "APPROVED") return "/pending";
  const first = user.effective[0];
  return first ? featureByKey(first).href : "/profile";
}

/** For server layouts: redirect anyone who shouldn't see an app page. */
export async function requireAppUser(feature?: FeatureKey) {
  const user = await getCurrentUser();
  if (!user || !user.onboardedAt || user.status !== "APPROVED") redirect(homeFor(user));
  if (feature && !user.effective.includes(feature)) redirect(homeFor(user));
  return user;
}

export async function requireAdminPage() {
  const user = await requireAppUser();
  if (user.role !== "ADMIN") redirect(homeFor(user));
  return user;
}
