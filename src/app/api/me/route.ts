import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/session";

export async function GET() {
  const user = await resolveUser();
  if (!user) {
    return NextResponse.json({ email: null, onboarded: false });
  }
  return NextResponse.json({
    email: user.email,
    onboarded: !!user.onboardedAt,
    theme: user.theme,
  });
}
