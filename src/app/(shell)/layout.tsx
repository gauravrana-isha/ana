import { cookies } from "next/headers";
import { Sidebar } from "@/components/shell/Sidebar";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { Topbar } from "@/components/shell/Topbar";
import { SearchDialog } from "@/components/shell/Search";
import { CacheGuard } from "@/components/shell/CacheGuard";
import { NavProgress } from "@/components/shell/NavProgress";
import { TapFeedback } from "@/components/shell/TapFeedback";
import { PullToRefresh } from "@/components/shell/PullToRefresh";
import type { NavItem } from "@/components/shell/nav";
import { requireAppUser } from "@/lib/session";
import { storageMode } from "@/lib/storage";
import { VaultGate } from "@/components/vault/VaultGate";
import { BundlesProvider } from "@/components/shell/Bundles";

export default async function ShellLayout({ children }: { children: React.ReactNode }) {
  const user = await requireAppUser();

  const collapsed = (await cookies()).get("ana-sidebar")?.value === "collapsed";
  const admin: NavItem | null =
    user.role === "ADMIN" ? { key: "admin", label: "Access", href: "/admin" } : null;

  return (
    <VaultGate
      user={{ id: user.id, name: user.name ?? "", email: user.email ?? "", storage: storageMode() }}
      vault={{ set: !!user.vaultAt, check: user.vaultCheck, sealed: !!user.vaultSealedAt }}
    >
    <BundlesProvider bundles={user.bundles}>
    <div className="flex min-h-dvh">
      <Sidebar
        footerItems={admin ? [admin] : []}
        user={{ name: user.name ?? user.email ?? "You", image: user.photoId ? `/api/media/${user.photoId}` : user.image }}
        initialCollapsed={collapsed}
      />
      <main className="flex-1 min-w-0">
        <div className="ana-page max-w-[860px] mx-auto w-full px-4 sm:px-6 pt-[calc(var(--safe-top)+16px)] pb-[calc(96px+env(safe-area-inset-bottom))] lg:px-12 lg:pt-10 lg:pb-16">
          <Topbar />
          {children}
        </div>
      </main>
      {/* Phones: five tabs at most (lib/nav-plan); Profile is the picture on Home. */}
      <MobileTabBar />
      <SearchDialog />
      <CacheGuard userId={user.id} />
      <NavProgress />
      <TapFeedback />
      <PullToRefresh />
    </div>
    </BundlesProvider>
    </VaultGate>
  );
}
