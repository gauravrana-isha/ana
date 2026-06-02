import { Sidebar } from "@/components/shell/Sidebar";
import { MobileTabBar } from "@/components/shell/MobileTabBar";
import { Topbar } from "@/components/shell/Topbar";
import { PageTransition } from "@/components/shell/PageTransition";

export default function ShellLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh">
      <Sidebar />
      <main className="flex-1 overflow-y-auto">
        <div className="max-w-[820px] mx-auto w-full px-[22px] pt-7 pb-[88px] lg:px-[50px] lg:pt-10 lg:pb-10">
          <Topbar />
          <PageTransition>{children}</PageTransition>
        </div>
      </main>
      <MobileTabBar />
    </div>
  );
}
