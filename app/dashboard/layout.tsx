"use client";

import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { DashboardSidebar } from "@/components/dashboard-sidebar";
import { SessionProvider, useSessionContext } from "@/components/providers/session-provider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionProvider>
      <DashboardLayoutContent>{children}</DashboardLayoutContent>
    </SessionProvider>
  );
}

function DashboardLayoutContent({ children }: { children: React.ReactNode }) {
  const { session, isLoading } = useSessionContext();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-zinc-50 dark:bg-zinc-950">
        <div className="text-sm text-zinc-600 dark:text-zinc-400 font-semibold">
          Loading TakoHub...
        </div>
      </div>
    );
  }

  if (!session) {
    return null;
  }

  const userInitial = (session.user.name || "U").charAt(0).toUpperCase();

  return (
    <SidebarProvider>
      <div className="flex w-full h-screen bg-zinc-50 dark:bg-zinc-950 text-zinc-900 dark:text-zinc-100 overflow-hidden">
        <DashboardSidebar session={session} />
        
        <div className="flex flex-col flex-1 w-full min-w-0 h-screen overflow-hidden">
          {/* Mobile Top Navigation Header with Hamburger Menu */}
          <header className="flex md:hidden items-center justify-between h-14 px-4 border-b border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shrink-0 z-30">
            <div className="flex items-center gap-2">
              <SidebarTrigger className="h-10 w-10 text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800" />
              <div className="flex items-center gap-2 font-bold text-sm text-zinc-900 dark:text-zinc-100">
                <span className="w-6 h-6 rounded bg-[#F4D671] text-[#1C1C1C] flex items-center justify-center text-xs font-black">
                  T
                </span>
                <span className="text-base">TakoHub</span>
              </div>
            </div>
            <div className="w-8 h-8 rounded-full bg-[#F4D671] text-[#1C1C1C] font-bold text-sm flex items-center justify-center border border-[#ebd060]">
              {userInitial}
            </div>
          </header>

          {/* Main Scrollable Viewport */}
          <main className="flex-1 overflow-y-auto">
            <div className="p-4 sm:p-6 max-w-7xl mx-auto w-full">{children}</div>
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}