import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies } from "next/headers";
import { db } from "./db";
import { effectiveBundles, effectiveFeatures, featureByKey, type FeatureKey } from "./features";

const SESSION_COOKIES = ["__Secure-authjs.session-token", "authjs.session-token"];
const DAY_MS = 24 * 60 * 60 * 1000;
/** Same as Auth.js: sessions last 30 days and are pushed forward at most once a day. */
const SESSION_MAX_AGE_MS = 30 * DAY_MS;
const SESSION_UPDATE_AGE_MS = DAY_MS;
const SEEN_EVERY_MS = 10 * 60 * 1000;

/**
 * The signed-in user with their feature rows, whatever their status.
 * Cached per request so layouts, pages and guards share one lookup.
 *
 * Reads the Auth.js database session straight from its cookie in ONE query (session, user
 * and features joined), instead of auth() plus a second user lookup (four queries). Every
 * page and API call starts here, so this is the hottest path in the app.
 */
export const getCurrentUser = cache(async () => {
  const jar = await cookies();
  const token = SESSION_COOKIES.map((n) => jar.get(n)?.value).find(Boolean);
  if (!token) return null;
  const session = await db.session.findUnique({
    where: { sessionToken: token },
    relationLoadStrategy: "join",
    include: { user: { include: { features: true } } },
  });
  if (!session || session.expires.getTime() < Date.now()) return null;
  // Rolling expiry, as Auth.js does: extend once the session is a day old. Not awaited.
  if (session.expires.getTime() - SESSION_MAX_AGE_MS + SESSION_UPDATE_AGE_MS < Date.now()) {
    db.session
      .update({ where: { sessionToken: token }, data: { expires: new Date(Date.now() + SESSION_MAX_AGE_MS) } })
      .catch(() => {});
  }
  const user = session.user;
  // "Last seen" for the admin page: at most one small write every 10 minutes. Not awaited.
  if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > SEEN_EVERY_MS) {
    db.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => {});
  }
  const effective = effectiveFeatures(user.features);
  return { ...user, effective, bundles: effectiveBundles(user.features) };
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
