"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Eye } from "lucide-react";
import { formatPeso } from "@/lib/business-logic";
import { SelfieViewDialog } from "@/components/selfie-view-dialog";
import { useSessionContext } from "@/components/providers/session-provider";
import {
  useAttendanceHistoryQuery,
  useBranchesQuery,
  useUsersQuery,
} from "@/lib/queries";
import type { ActiveEmployeeShift, SessionUser } from "@/lib/types";

export default function AttendancePage() {
  const { user } = useSessionContext();

  // Filter input states
  const [filterDate, setFilterDate] = useState<string>("");
  const [filterEmployee, setFilterEmployee] = useState<string>("");
  const [filterRole, setFilterRole] = useState<string>("");
  const [filterBranch, setFilterBranch] = useState<string>("");
  const [filterStatus, setFilterStatus] = useState<string>("");

  // Applied query filters
  const [appliedFilters, setAppliedFilters] = useState<{
    date?: string;
    userId?: string;
    role?: string;
    branchId?: string;
    status?: string;
  }>({});

  // Selfie preview modal
  const [previewShift, setPreviewShift] = useState<ActiveEmployeeShift | null>(null);

  const isAdmin = user?.role === "ADMIN";

  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  const { data: usersData } = useUsersQuery(isAdmin);
  const employees = usersData?.users || [];

  const { data: attendanceData, isLoading } = useAttendanceHistoryQuery(appliedFilters);
  const records = attendanceData?.records || [];

  const handleApplyFilters = (e: React.FormEvent) => {
    e.preventDefault();
    setAppliedFilters({
      date: filterDate || undefined,
      userId: filterEmployee || undefined,
      role: filterRole || undefined,
      branchId: filterBranch || undefined,
      status: filterStatus || undefined,
    });
  };

  const handleResetFilters = () => {
    setFilterDate("");
    setFilterEmployee("");
    setFilterRole("");
    setFilterBranch("");
    setFilterStatus("");
    setAppliedFilters({});
  };

  const formatDuration = (mins?: number | null) => {
    if (!mins) return "—";
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return `${h}h ${m}m`;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          Attendance Records
        </h1>
        <p className="text-xs text-zinc-500">
          Biometric shift logs, employee selfie proofs, and sales logs.
        </p>
      </div>

      {/* Attendance Filters */}
      {isAdmin && (
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardContent className="p-4">
            <form onSubmit={handleApplyFilters} className="space-y-3">
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-3">
                {/* Date */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Date</label>
                  <Input
                    type="date"
                    value={filterDate}
                    onChange={(e) => setFilterDate(e.target.value)}
                    className="h-9 text-xs"
                  />
                </div>

                {/* Employee */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Employee</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filterEmployee}
                    onChange={(e) => setFilterEmployee(e.target.value)}
                  >
                    <option value="">All Employees</option>
                    {employees.map((emp) => (
                      <option key={emp.id} value={emp.id}>
                        {emp.name} ({emp.role})
                      </option>
                    ))}
                  </select>
                </div>

                {/* Role */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Role</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filterRole}
                    onChange={(e) => setFilterRole(e.target.value)}
                  >
                    <option value="">All Roles</option>
                    <option value="BS">Branch Seller (BS)</option>
                    <option value="IM">Inventory Manager (IM)</option>
                    <option value="ADMIN">Admin / Owner</option>
                  </select>
                </div>

                {/* Branch */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Branch</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filterBranch}
                    onChange={(e) => setFilterBranch(e.target.value)}
                  >
                    <option value="">All Branches</option>
                    {branches.map((b) => (
                      <option key={b.branchId} value={b.branchId}>
                        {b.branchName}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Status */}
                <div>
                  <label className="text-xs text-zinc-500 block mb-1">Status</label>
                  <select
                    className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                  >
                    <option value="">All Status</option>
                    <option value="ACTIVE">ACTIVE</option>
                    <option value="COMPLETED">COMPLETED</option>
                  </select>
                </div>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
                <Button
                  type="button"
                  variant="tertiary"
                  size="sm"
                  onClick={handleResetFilters}
                  className="text-xs h-8"
                >
                  Reset
                </Button>
                <Button
                  type="submit"
                  variant="secondary"
                  size="sm"
                  className="text-xs h-8"
                >
                  Apply Filters
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}

      {/* Attendance Records Table */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading records...</p>
          ) : records.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              No attendance records found matching the filters.
            </p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                    <th className="py-3 px-4 font-bold">Employee</th>
                    <th className="py-3 px-4 font-bold">Branch</th>
                    <th className="py-3 px-4 font-bold">Shift Start</th>
                    <th className="py-3 px-4 font-bold">Shift End</th>
                    <th className="py-3 px-4 font-bold text-center">Duration</th>
                    <th className="py-3 px-4 font-bold">Status</th>
                    <th className="py-3 px-4 font-bold text-center">Plates</th>
                    <th className="py-3 px-4 font-bold text-right">Sales / Salary</th>
                    <th className="py-3 px-4 font-bold text-right">Selfie Proof</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {records.map((rec: any) => {
                    const empInitial = (rec.userName || "U").charAt(0).toUpperCase();
                    return (
                      <tr
                        key={rec.sessionId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        {/* Employee with Avatar on first column */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-2.5">
                            <div className="w-8 h-8 rounded-full bg-[#F4D671] text-[#1C1C1C] font-bold text-sm flex items-center justify-center shrink-0 shadow-2xs border border-[#ebd060]">
                              {empInitial}
                            </div>
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                {rec.userName}
                              </div>
                              <div className="text-xs text-zinc-500 font-semibold">{rec.role}</div>
                            </div>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-semibold">
                          {rec.branchName}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {new Date(rec.startShift).toLocaleString("en-PH", {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {rec.endShift
                            ? new Date(rec.endShift).toLocaleTimeString([], {
                                hour: "2-digit",
                                minute: "2-digit",
                              })
                            : "—"}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-zinc-600 dark:text-zinc-400 font-bold">
                          {formatDuration(rec.durationMinutes)}
                        </td>
                        <td className="py-3 px-4">
                          <Badge
                            variant="outline"
                            className={
                              rec.shiftStatus === "ACTIVE"
                                ? "border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20 text-xs px-2.5 py-0.5 font-bold"
                                : "border-zinc-300 text-zinc-500 bg-zinc-50 dark:bg-zinc-900/50 text-xs px-2.5 py-0.5 font-bold"
                            }
                          >
                            {rec.shiftStatus}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100 text-base">
                          {rec.role === "BS" ? (rec.totalPlates ?? "—") : "—"}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {rec.role === "BS" && rec.totalSales != null ? (
                            <div>
                              <div className="font-bold text-zinc-900 dark:text-zinc-100">
                                {formatPeso(rec.totalSales)}
                              </div>
                              <div className="text-xs text-zinc-500 font-medium mt-0.5">
                                Salary: {formatPeso(rec.salary ?? 0)}
                              </div>
                            </div>
                          ) : (
                            <span className="text-zinc-400 font-medium">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right">
                          {rec.selfieUrl ? (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() =>
                                setPreviewShift({
                                  sessionId: rec.sessionId,
                                  userId: rec.userId,
                                  userName: rec.userName,
                                  role: rec.role as any,
                                  branchId: rec.branchId,
                                  branchName: rec.branchName,
                                  startShift: rec.startShift,
                                  endShift: rec.endShift,
                                  shiftStatus: rec.shiftStatus,
                                  selfieUrl: rec.selfieUrl,
                                })
                              }
                              className="text-xs h-7 gap-1 text-zinc-700 dark:text-zinc-300 hover:text-zinc-950 dark:hover:text-white"
                            >
                              <Eye size={14} />
                              <span>View</span>
                            </Button>
                          ) : (
                            <span className="text-zinc-400 text-[10px]">No photo</span>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Selfie Preview Lightbox */}
      <SelfieViewDialog
        isOpen={!!previewShift}
        onClose={() => setPreviewShift(null)}
        shift={previewShift}
      />
    </div>
  );
}
