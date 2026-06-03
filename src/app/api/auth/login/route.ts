import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

const LoginSchema = z.object({
  email: z.string().min(3).max(100),
  password: z.string().min(4).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = LoginSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input" }, { status: 400 });
  }

  const { email, password } = parsed.data;
  const hashedPassword = Buffer.from(password).toString("base64");
  const expectedDeviceId = `auth:${email}:${hashedPassword}`;

  // Find user by email
  const user = await db.user.findUnique({ where: { email } });
  if (!user) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Verify the deviceId matches
  if (user.deviceId !== expectedDeviceId) {
    return NextResponse.json({ error: "Invalid credentials" }, { status: 401 });
  }

  // Set cookie
  const cookieStore = await cookies();
  cookieStore.set("ana-device-id", user.deviceId!, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
