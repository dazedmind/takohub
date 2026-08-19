"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useSessionContext } from "@/components/providers/session-provider";
import { formatPeso } from "@/lib/business-logic";
import { ActiveShiftCard } from "@/components/active-shift-card";
import { CameraModal } from "@/components/camera-modal";
import { SalesLogModal } from "@/components/sales-log-modal";
import { SelfieViewDialog } from "@/components/selfie-view-dialog";
import {
  useActiveShiftQuery,
  useBranchesQuery,
  useDashboardStatsQuery,
} from "@/lib/queries";
import { useQueryClient } from "@tanstack/react-query";
import type {
  ActiveEmployeeShift,
  SessionUser,
} from "@/lib/types";

export default function DashboardHome() {
  const { user } = useSessionContext();
  const queryClient = useQueryClient();

  // Modals state
  const [cameraModalOpen, setCameraModalOpen] = useState(false);
  const [salesLogModalOpen, setSalesLogModalOpen] = useState(false);
  const [selfieViewShift, setSelfieViewShift] = useState<ActiveEmployeeShift | null>(null);

  const isAdmin = user?.role === "ADMIN";
  const isIM = user?.role === "IM";
  const isBS = user?.role === "BS";

  // TanStack Queries
  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  const { data: activeShiftData, isLoading: isShiftLoading } = useActiveShiftQuery();
  const userActiveShift = activeShiftData?.activeShift || null;

  const { data: statsData, isLoading: isStatsLoading } = useDashboardStatsQuery(isAdmin);
  const stats = statsData?.stats || null;

  const handleRefresh = () => {
    queryClient.invalidateQueries({ queryKey: ["attendance"] });
    queryClient.invalidateQueries({ queryKey: ["dashboard"] });
    queryClient.invalidateQueries({ queryKey: ["inventory"] });
    queryClient.invalidateQueries({ queryKey: ["orders"] });
  };

  if (!user && (isShiftLoading || isStatsLoading)) {
    return (
      <div className="flex items-center justify-center min-h-[50vh]">
        <p className="text-sm text-zinc-500">Loading TakoHub...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header & User Info */}
      <div className="space-y-1 pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Welcome back, {user?.name?.split(" ")[0] || "User"}
        </h1>
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5 text-sm text-zinc-600 dark:text-zinc-400">
          {userActiveShift && (
            <div>
              <span className="text-zinc-400">Branch: </span>
              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                {userActiveShift.branchName}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* BRANCH SELLER & INVENTORY MANAGER: PRIMARY OPERATIONAL CARDS */}
      {(isBS || isIM) && (
        <div className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Action 1: Start Shift or Active Shift */}
            {!userActiveShift ? (
              <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
                <CardHeader className="pb-2">
                  <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                    Attendance
                  </span>
                  <CardTitle className="text-lg font-bold">Start Shift</CardTitle>
                </CardHeader>
                <CardContent className="pt-2">
                  <Button
                    variant="secondary"
                    onClick={() => setCameraModalOpen(true)}
                    className="w-full h-11 text-sm font-bold"
                  >
                    Start Shift
                  </Button>
                </CardContent>
              </Card>
            ) : (
              <ActiveShiftCard
                shift={userActiveShift}
                onOpenSalesLog={() => setSalesLogModalOpen(true)}
                onViewSelfie={() => setSelfieViewShift(userActiveShift)}
              />
            )}

            {/* Action 2: Manage Orders */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  {isBS ? "Branch Requests" : "Fulfillment Queue"}
                </span>
                <CardTitle className="text-lg font-bold">
                  {isBS ? "Manage Orders" : "Process Orders"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Link href="/dashboard/orders" className="block w-full">
                  <Button variant="primary" className="w-full h-11 text-sm font-bold">
                    {isBS ? "Open Order Basket" : "Open Orders Queue"}
                  </Button>
                </Link>
              </CardContent>
            </Card>

            {/* Action 3: Manage Inventory */}
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm flex flex-col justify-between">
              <CardHeader className="pb-2">
                <span className="text-xs font-bold uppercase tracking-wider text-zinc-500">
                  Stock Operations
                </span>
                <CardTitle className="text-lg font-bold">
                  {isBS ? "Manage Inventory" : "Central Inventory"}
                </CardTitle>
              </CardHeader>
              <CardContent className="pt-2">
                <Link href="/dashboard/inventory" className="block w-full">
                  <Button variant="tertiary" className="w-full h-11 text-sm font-bold">
                    {isBS ? "View Branch Stock" : "Manage Warehouse Stock"}
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* ADMIN OVERVIEW */}
      {isAdmin && (
        <div className="space-y-6">
          {/* Key Metrics Grid */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Today&apos;s Revenue</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {formatPeso(stats?.dailyRevenue ?? 0)}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  {stats?.totalPlatesToday ?? 0} plates sold
                </p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Active Employees</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {stats?.activeEmployeesCount ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Currently on shift</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Pending Orders</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {stats?.pendingOrders ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">Awaiting fulfillment</p>
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-1 pt-4 px-4">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-zinc-500">Total Branches</CardTitle>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <div className="text-2xl font-black text-zinc-900 dark:text-zinc-100">
                  {stats?.totalBranches ?? 0}
                </div>
                <p className="text-xs text-zinc-500 mt-1 font-medium">
                  {stats?.totalInventory ?? 0} master items
                </p>
              </CardContent>
            </Card>
          </div>

          {/* Active Employees Shift Monitoring */}
          <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-3">
              <div>
                <CardTitle className="text-base font-bold">Active Employee Shifts</CardTitle>
                <CardDescription className="text-sm">
                  Employees currently working across branches with dynamic running time.
                </CardDescription>
              </div>
              <Link href="/dashboard/attendance">
                <Button variant="tertiary" size="sm" className="h-8 text-xs font-semibold">
                  View All Attendance
                </Button>
              </Link>
            </CardHeader>
            <CardContent>
              {stats?.activeShifts && stats.activeShifts.length > 0 ? (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {stats.activeShifts.map((shift) => (
                    <ActiveShiftCard
                      key={shift.sessionId}
                      shift={shift}
                      isAdminView={true}
                      onViewSelfie={() => setSelfieViewShift(shift)}
                    />
                  ))}
                </div>
              ) : (
                <p className="text-sm text-zinc-500 py-6 text-center">
                  No employees currently on active shift.
                </p>
              )}
            </CardContent>
          </Card>

          {/* Activity & Low Stock */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="pb-2">
                <CardTitle className="text-base font-bold">Recent Activity</CardTitle>
              </CardHeader>
              <CardContent>
                {stats?.recentActivity && stats.recentActivity.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {stats.recentActivity.map((activity) => (
                      <div
                        key={activity.id}
                        className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <span className="font-medium">{activity.description}</span>
                        <span className="text-zinc-500 font-mono text-xs">
                          {new Date(activity.timestamp).toLocaleTimeString([], {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-4 text-center">No recent activity.</p>
                )}
              </CardContent>
            </Card>

            <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-base font-bold">Central Low Stock</CardTitle>
                <Link href="/dashboard/inventory">
                  <Button variant="tertiary" size="sm" className="h-8 text-xs font-semibold">
                    Inventory
                  </Button>
                </Link>
              </CardHeader>
              <CardContent>
                {stats?.lowStockItems && stats.lowStockItems.length > 0 ? (
                  <div className="space-y-2 text-sm">
                    {stats.lowStockItems.map((item) => (
                      <div
                        key={item.itemId}
                        className="flex items-center justify-between py-2 border-b border-zinc-100 dark:border-zinc-800 last:border-0"
                      >
                        <span className="font-medium">{item.itemName}</span>
                        <span className="font-bold text-red-600 dark:text-red-400 text-sm">
                          {item.centralStock} {item.unit || "pcs"} left
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-zinc-500 py-4 text-center">
                    All central items have sufficient stock.
                  </p>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Camera Modal */}
      <CameraModal
        isOpen={cameraModalOpen}
        onClose={() => setCameraModalOpen(false)}
        onSuccess={handleRefresh}
        branches={branches}
      />

      {/* End Shift Modal with IM EOD Report Support */}
      <SalesLogModal
        isOpen={salesLogModalOpen}
        onClose={() => setSalesLogModalOpen(false)}
        onSuccess={handleRefresh}
        activeShift={userActiveShift}
        userRole={user?.role}
      />

      {/* Selfie View Lightbox */}
      <SelfieViewDialog
        isOpen={!!selfieViewShift}
        onClose={() => setSelfieViewShift(null)}
        shift={selfieViewShift}
      />
    </div>
  );
}
