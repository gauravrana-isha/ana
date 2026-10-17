import { NextRequest, NextResponse } from "next/server";
import { INVITE_COOKIE, claimInvite, usableInvite } from "@/lib/invites";
import { getCurrentUser, homeFor } from "@/lib/session";

/**
 * An invite link. The code is kept (in a cookie) through Google sign-in and onboarding, and
 * used when onboarding finishes. Someone already signed in and waiting is let in right away.
 */
export async function GET(req: NextRequest, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const invite = await usableInvite(code);
  const to = (path: string) => NextResponse.redirect(new URL(path, req.url));
  if (!invite) return to("/login?invite=used");

  const user = await getCurrentUser();
  if (user?.status === "APPROVED") return to(homeFor(user));
  if (user?.onboardedAt && user.status === "PENDING") {
    await claimInvite(user.id, invite.code);
    return to("/");
  }
  const res = to(user ? "/onboarding" : "/login?invite=1");
  res.cookies.set(INVITE_COOKIE, invite.code, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: 30 * 24 * 3600,
    path: "/",
  });
  return res;
}
