import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { Topbar } from "@/components/shell/Topbar";
import { SearchDialog } from "@/components/shell/Search";
import { CacheGuard } from "@/components/shell/CacheGuard";
import type { NavItem } from "@/components/shell/nav";
import { requireAppUser } from "@/lib/session";
import { featureByKey } from "@/lib/features";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();

  const features: NavItem[] = user.effective.map((key) => {
    const f = featureByKey(key);
    return { key, label: f.label, href: f.href };
  });
  const profile: NavItem = { key: "profile", label: "Profile", href: "/profile" };
  const collapsed = (await cookies()).get("ana-sidebar")?.value === "collapsed";
  const admin: NavItem | null =
    user.role === "ADMIN" ? { key: "admin", label: "Access", href: "/admin" } : null;

  return (
    <div className="flex min-h-dvh">
      <Sidebar
        items={features}
        footerItems={admin ? [admin] : []}
        user={{ name: user.name ?? user.email ?? "You", image: user.image }}
        initialCollapsed={collapsed}
      />
      <main className="flex-1 min-w-0">
        <div className="max-w-[860px] mx-auto w-full px-4 sm:px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] lg:px-12 lg:pt-10 lg:pb-16">
          <Topbar />
          {children}
        </div>
      </main>
      {/* Phones show up to four sections plus Settings; with more, the rest move under "More". */}
      <MobileTabBar items={features} extras={admin ? [profile, admin] : [profile]} />
      <SearchDialog />
      <CacheGuard userId={user.id} />
    </div>
  );
}
