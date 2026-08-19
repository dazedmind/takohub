"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Button } from "@/components/ui/button";
import {
  Home,
  Package,
  Store,
  Users,
  ShoppingCart,
  Clock,
  Receipt,
  LogOut,
} from "lucide-react";
import { authClient } from "@/lib/auth-client";
import type { AppSession, UserRole } from "@/lib/types";
import Logo from "/logo.png"
import Image from "next/image";

const ROLE_LABELS: Record<UserRole, string> = {
  ADMIN: "Owner (Admin)",
  IM: "Inventory Manager",
  BS: "Branch Seller",
};

interface DashboardSidebarProps {
  session: AppSession | null;
}

const MENU_CONFIG: Record<
  UserRole,
  Array<{ name: string; href: string; icon: React.ReactNode }>
> = {
  ADMIN: [
    { name: "Overview", href: "/dashboard", icon: <Home size={20} /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <Package size={20} /> },
    { name: "Orders", href: "/dashboard/orders", icon: <ShoppingCart size={20} /> },
    { name: "Attendance", href: "/dashboard/attendance", icon: <Clock size={20} /> },
    { name: "Sales", href: "/dashboard/sales", icon: <Receipt size={20} /> },
    { name: "Branches", href: "/dashboard/branches", icon: <Store size={20} /> },
    { name: "Users", href: "/dashboard/users", icon: <Users size={20} /> },
  ],
  IM: [
    { name: "Home", href: "/dashboard", icon: <Home size={20} /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <Package size={20} /> },
    { name: "Orders", href: "/dashboard/orders", icon: <ShoppingCart size={20} /> },
    { name: "Attendance", href: "/dashboard/attendance", icon: <Clock size={20} /> },
  ],
  BS: [
    { name: "Home", href: "/dashboard", icon: <Home size={20} /> },
    { name: "Orders", href: "/dashboard/orders", icon: <ShoppingCart size={20} /> },
    { name: "Inventory", href: "/dashboard/inventory", icon: <Package size={20} /> },
    { name: "Attendance", href: "/dashboard/attendance", icon: <Clock size={20} /> },
    { name: "Sales Logs", href: "/dashboard/sales", icon: <Receipt size={20} /> },
  ],
};

export function DashboardSidebar({ session }: DashboardSidebarProps) {
  const pathname = usePathname();
  const [isLoading, setIsLoading] = useState(false);

  const userRole = (session?.user?.role as UserRole) || "BS";
  const menuItems = MENU_CONFIG[userRole] || MENU_CONFIG.BS;
  const userName = session?.user?.name || "User";
  const userInitial = userName.charAt(0).toUpperCase();

  const handleLogout = async () => {
    setIsLoading(true);
    try {
      await authClient.signOut();
      window.location.href = "/login";
    } catch (error) {
      console.error("Logout failed:", error);
      setIsLoading(false);
    }
  };

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-zinc-200 dark:border-zinc-800">
        <div className="flex items-center gap-3 px-4 py-3.5">
          <div>
              <Image src={Logo} alt="" className="w-10 h-auto" />
          </div>
          <div>
            <h1 className="font-bold">
              Toshiyuki Takoyaki
            </h1>
            <p className="text-xs text-zinc-500 font-medium">
              Management System
            </p>
          </div>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarMenu className="px-3 py-3 space-y-1">
          {menuItems.map((item) => {
            const isActive =
              pathname === item.href ||
              (item.href !== "/dashboard" && pathname.startsWith(item.href));
            return (
              <SidebarMenuItem key={item.href}>
                <SidebarMenuButton
                  asChild
                  isActive={isActive}
                  className={`h-10 px-3.5 rounded-lg text-sm font-semibold transition-colors ${
                    isActive
                      ? "bg-[#F4D671]/20 text-[#1C1C1C] dark:text-[#F4D671] font-bold"
                      : "text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white hover:bg-zinc-100 dark:hover:bg-zinc-800"
                  }`}
                >
                  <Link href={item.href} className="flex items-center gap-3">
                    {item.icon}
                    <span className="text-sm">{item.name}</span>
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            );
          })}
        </SidebarMenu>
      </SidebarContent>

      <SidebarFooter className="p-3.5 border-t border-zinc-200 dark:border-zinc-800 space-y-3">
        {/* User Profile Info with Avatar */}
        <div className="flex items-center gap-3 px-2 py-1">
          <div className="w-9 h-9 rounded-full bg-[#F4D671] text-[#1C1C1C] font-bold text-sm flex items-center justify-center shrink-0 shadow-xs border border-[#ebd060]">
            {userInitial}
          </div>
          <div className="min-w-0 flex-1">
            <p className="text-sm font-bold text-zinc-900 dark:text-zinc-100 truncate">
              {userName}
            </p>
            <p className="text-xs text-zinc-500 font-medium truncate">
              {ROLE_LABELS[userRole]}
            </p>
          </div>
        </div>

        <Button
          onClick={handleLogout}
          disabled={isLoading}
          variant="tertiary"
          size="sm"
          className="w-full text-sm font-semibold h-9"
        >
          <LogOut size={15} className="mr-2" />
          {isLoading ? "Signing out..." : "Sign Out"}
        </Button>
      </SidebarFooter>
    </Sidebar>
  );
}
