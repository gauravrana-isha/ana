import { NextRequest, NextResponse } from "next/server";
import { cookies } from "next/headers";
import { z } from "zod";
import { db } from "@/lib/db";

const RegisterSchema = z.object({
  email: z.string().min(3).max(100),
  password: z.string().min(4).max(100),
});

export async function POST(req: NextRequest) {
  const body = await req.json();
  const parsed = RegisterSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Invalid input — username min 3 chars, password min 4 chars" }, { status: 400 });
  }

  const { email, password } = parsed.data;

  // Check if user exists
  const existing = await db.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json({ error: "Username already taken" }, { status: 409 });
  }

  // Create a deviceId that encodes the credentials (simple demo auth)
  const hashedPassword = Buffer.from(password).toString("base64");
  const deviceId = `auth:${email}:${hashedPassword}`;

  const cookieStore = await cookies();
  const existingDeviceId = cookieStore.get("ana-device-id")?.value;

  let user;

  if (existingDeviceId) {
    // Upgrade existing anonymous user
    const existingUser = await db.user.findUnique({ where: { deviceId: existingDeviceId } });
    if (existingUser) {
      user = await db.user.update({
        where: { id: existingUser.id },
        data: { email, deviceId },
      });
    }
  }

  if (!user) {
    user = await db.user.create({
      data: { email, deviceId },
    });
  }

  // Set cookie
  cookieStore.set("ana-device-id", deviceId, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
    secure: process.env.NODE_ENV === "production",
  });

  return NextResponse.json({ ok: true, userId: user.id });
}
