import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { Topbar } from "@/components/shell/Topbar";
import { SearchDialog } from "@/components/shell/Search";
import { CacheGuard } from "@/components/shell/CacheGuard";
import { NavProgress } from "@/components/shell/NavProgress";
import { TapFeedback } from "@/components/shell/TapFeedback";
import type { NavItem } from "@/components/shell/nav";
import { requireAppUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { VaultGate } from "@/components/vault/VaultGate";
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
    <VaultGate
      user={{ id: user.id, name: user.name ?? "", email: user.email ?? "", storage: storageMode() }}
      vault={{ set: !!user.vaultAt, check: user.vaultCheck, sealed: !!user.vaultSealedAt }}
    >
    <div className="flex min-h-dvh">
      <Sidebar
        items={features}
        footerItems={admin ? [admin] : []}
        user={{ name: user.name ?? user.email ?? "You", image: user.photoId ? `/api/media/${user.photoId}` : user.image }}
        initialCollapsed={collapsed}
      />
      <main className="flex-1 min-w-0">
        {/* Phones: always a little taller than the screen, so the logo row can tuck away above the title. */}
        <div className="ana-page max-lg:min-h-[calc(100dvh+72px)] max-w-[860px] mx-auto w-full px-4 sm:px-6 pt-[max(20px,env(safe-area-inset-top))] pb-[calc(96px+env(safe-area-inset-bottom))] lg:px-12 lg:pt-10 lg:pb-16">
          <Topbar />
          {children}
        </div>
      </main>
      {/* Phones show up to four sections plus Settings; with more, the rest move under "More". */}
      <MobileTabBar items={features} extras={admin ? [profile, admin] : [profile]} />
      <SearchDialog />
      <CacheGuard userId={user.id} />
      <NavProgress />
      <TapFeedback />
    </div>
    </VaultGate>
  );
}
