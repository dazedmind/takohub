"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { useSessionContext } from "@/components/providers/session-provider";
import { formatPeso, formatShortOver } from "@/lib/business-logic";
import { useBranchesQuery, useSalesQuery } from "@/lib/queries";
import type { SessionUser } from "@/lib/types";

export default function SalesPage() {
  const { user } = useSessionContext();
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");

  const isBS = user?.role === "BS";

  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  const { data: salesData, isLoading } = useSalesQuery({
    branchId: selectedBranch,
    startDate,
    endDate,
  });

  const sales = salesData?.sales || [];
  const summary = salesData?.summary || {
    totalRevenue: 0,
    totalPlates: 0,
    totalSalary: 0,
    totalExpenses: 0,
    recordCount: 0,
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <h1 className="text-xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
          {isBS ? "My Sales Logs" : "Sales Records"}
        </h1>
        <p className="text-xs text-zinc-500">
          Historical plate sales, revenue breakdown, and calculated staff salary.
        </p>
      </div>

      {/* Summary Metrics Grid */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Revenue</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatPeso(summary.totalRevenue)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">{summary.recordCount} completed shifts</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Plates Sold</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {summary.totalPlates}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Cheese, Octobits & Crab</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Salary</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatPeso(summary.totalSalary)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Salary matrix payouts</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
              {formatPeso(summary.totalExpenses)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Branch disbursements</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
        <CardContent className="p-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
            {!isBS && (
              <div>
                <label className="text-zinc-500 block mb-1">Branch</label>
                <select
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selectedBranch}
                  onChange={(e) => setSelectedBranch(e.target.value)}
                >
                  <option value="">All Branches</option>
                  {branches.map((b) => (
                    <option key={b.branchId} value={b.branchId}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div>
              <label className="text-zinc-500 block mb-1">Start Date</label>
              <Input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>

            <div>
              <label className="text-zinc-500 block mb-1">End Date</label>
              <Input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Sales Table */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading sales logs...</p>
          ) : sales.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">No sales records found.</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                    <th className="py-3 px-4 font-bold">Date</th>
                    <th className="py-3 px-4 font-bold">Branch</th>
                    <th className="py-3 px-4 font-bold">Seller</th>
                    <th className="py-3 px-4 font-bold text-center">Plates (Ch/Oct/Cr)</th>
                    <th className="py-3 px-4 font-bold text-center">Total Plates</th>
                    <th className="py-3 px-4 font-bold text-right">Total Sales (Gross)</th>
                    {/* <th className="py-3 px-4 font-bold text-right">Gross</th> */}
                    <th className="py-3 px-4 font-bold text-right">Net</th>
                    <th className="py-3 px-4 font-bold text-right">Salary</th>
                    <th className="py-3 px-4 font-bold text-right">Cash / GCash</th>
                    <th className="py-3 px-4 font-bold text-center">Short / Over</th>
                    <th className="py-3 px-4 font-bold">Notes</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                  {sales.map((s: any) => {
                    const shortOverInfo = formatShortOver(s.shortOver || 0);
                    return (
                      <tr
                        key={s.salesId}
                        className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                      >
                        <td className="py-3 px-4 text-zinc-500 font-mono text-xs">
                          {new Date(s.date).toLocaleDateString("en-PH", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </td>
                        <td className="py-3 px-4 font-semibold">{s.branchName}</td>
                        <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100 font-bold">
                          {s.userName}
                        </td>
                        <td className="py-3 px-4 text-center text-zinc-600 dark:text-zinc-400 font-mono">
                          {s.cheese} / {s.octobits} / {s.crab}
                        </td>
                        <td className="py-3 px-4 text-center font-bold text-zinc-900 dark:text-zinc-100 text-base">
                          {s.totalPlates}
                        </td>
                        <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100">
                          {formatPeso(s.totalSales)}
                        </td>
                        {/* <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                          {formatPeso(s.grossSales ?? s.totalSales)}
                        </td> */}
                        <td className="py-3 px-4 text-right font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                          {formatPeso(s.netSales ?? (s.totalSales - s.expenses - (s.free || 0) - (s.shortOver || 0) - (Number(s.trashLeftover) || 0)))}
                        </td>
                        <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100">
                          {formatPeso(s.salary)}
                        </td>
                        <td className="py-3 px-4 text-right text-zinc-600 dark:text-zinc-400 font-mono text-xs">
                          {formatPeso(s.cashOnhand)} / {formatPeso(s.gcashPayment)}
                        </td>
                        <td className="py-3 px-4 text-center">
                          <span
                            className={
                              shortOverInfo.type === "SHORT"
                                ? "text-red-600 font-bold"
                                : shortOverInfo.type === "OVER"
                                ? "text-emerald-600 font-bold"
                                : "text-zinc-400 font-medium"
                            }
                          >
                            {shortOverInfo.text}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 italic max-w-xs truncate font-medium">
                          {s.trashLeftover || "—"}
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
    </div>
  );
}
