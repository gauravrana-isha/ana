import { allow } from "@/lib/ratelimit";
import { NextResponse } from "next/server";
import { resolveUser } from "@/lib/session";
import { sendToUser } from "@/lib/push";

/** Send a gentle test notification to all of this person's devices. */
export async function POST() {
  const user = await resolveUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!(await allow(`push-test:${user.id}`, 5))) return NextResponse.json({ error: "Too many tries. Wait a minute and try again." }, { status: 429 });
  const delivered = await sendToUser(user.id, {
    title: "ana",
    body: "Notifications are on. Moments and your letter will find you here.",
    url: "/profile",
    tag: "test",
  });
  return NextResponse.json({ delivered });
}
