import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { db } from "@/lib/db";
import { getCurrentUser } from "@/lib/session";

export async function POST(req: NextRequest) {
  const { theme } = await req.json().catch(() => ({}));
  if (theme !== "dark" && theme !== "light") {
    return NextResponse.json({ error: "Invalid theme" }, { status: 400 });
  }

  const cookieStore = await cookies();
  cookieStore.set("ana-theme", theme, {
    httpOnly: false, // read before paint to avoid a theme flash
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  const user = await getCurrentUser();
  if (user) {
    await db.user.update({ where: { id: user.id }, data: { theme: theme === "dark" ? "DARK" : "LIGHT" } });
  }

  return NextResponse.json({ ok: true, theme });
}
