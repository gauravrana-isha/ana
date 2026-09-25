import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Lotus } from "@/components/art/Lotus";
import { Ornament } from "@/components/art/Ornament";
import { Avatar } from "@/components/shell/Sidebar";
import { PendingWatcher } from "@/components/auth/PendingWatcher";
import { SignOutButton } from "@/components/auth/SignOutButton";
import { getCurrentUser, homeFor } from "@/lib/session";
import { featureByKey } from "@/lib/features";

export const metadata: Metadata = { title: "Almost there" };

export default async function PendingPage() {
  const user = await getCurrentUser();
  if (!user || !user.onboardedAt || user.status === "APPROVED") redirect(homeFor(user));
  const suspended = user.status === "SUSPENDED";
  const name = user.name ?? user.email ?? "friend";

  return (
    <main className="min-h-dvh flex items-center justify-center px-6 py-12">
      <div className="w-full max-w-[440px] text-center">
        <Lotus size={44} className="mx-auto text-accent" />
        <Ornament name="kolam" width={150} className="mx-auto mt-4 text-accent/50" />
        <h1 className="mt-6 font-display text-[30px] font-semibold tracking-[-0.02em] text-ink leading-[1.15]">
          {suspended ? "Your access is paused" : `Thank you, ${name.split(" ")[0]}`}
        </h1>
        <p className="mt-3 font-ui text-[15px] leading-[1.65] text-ink-soft">
          {suspended
            ? "An admin has paused this account. If you think this is a mistake, please reach out to them."
            : "Your journal is set up. An admin will look at your request soon; this page opens the app by itself once you're in."}
        </p>

        {!suspended && (
          <div className="mt-8 rounded-[18px] bg-surface p-5 text-left">
            <div className="flex items-center gap-3">
              <Avatar name={name} image={user.image} size={36} />
              <div className="min-w-0">
                <div className="font-ui text-[14px] font-semibold text-ink truncate">{name}</div>
                <div className="font-ui text-[13px] text-ink-soft truncate">{user.email}</div>
              </div>
            </div>
            <div className="mt-4 flex flex-wrap gap-1.5">
              {user.effective.map((k) => (
                <span key={k} className="px-2.5 py-1 rounded-full bg-bg font-ui text-[12px] font-medium text-ink-soft">
                  {featureByKey(k).label}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="mt-8"><SignOutButton withIcon={false} className="text-[14px] font-medium px-4 h-10" /></div>
        {!suspended && <PendingWatcher />}
      </div>
    </main>
  );
}
