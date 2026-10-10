"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { DatePicker } from "@/components/ui/date-picker";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Eye,
  Pen,
  Plus,
  RotateCcw,
  Search,
  Trash2,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/tooltip";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { useSessionContext } from "@/components/providers/session-provider";
import {
  useExpensesQuery,
  useCreateExpenseMutation,
  useUpdateExpenseMutation,
  useDeleteExpenseMutation,
  useBranchesQuery,
} from "@/lib/queries";
import { formatPeso } from "@/lib/business-logic";
import type { ExpenseWithDetails } from "@/lib/types";

type DatePreset = "daily" | "weekly" | "monthly" | "annually";

const EXPENSE_CATEGORIES = [
  "Inventory / Operations",
  "Supplies & Packaging",
  "Transportation / Logistics",
  "Maintenance / Repairs",
  "Utilities",
  "Store Operations",
  "Salaries & Wages",
  "Miscellaneous",
];

function formatDateStr(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function getPresetDateRange(preset: DatePreset): { startDate: string; endDate: string } {
  const now = new Date();
  const y = now.getFullYear();
  const m = now.getMonth();
  const d = now.getDate();

  switch (preset) {
    case "daily": {
      const todayStr = formatDateStr(now);
      return { startDate: todayStr, endDate: todayStr };
    }
    case "weekly": {
      const day = now.getDay();
      const diffToMonday = (day + 6) % 7;
      const monday = new Date(y, m, d - diffToMonday);
      const sunday = new Date(y, m, d - diffToMonday + 6);
      return {
        startDate: formatDateStr(monday),
        endDate: formatDateStr(sunday),
      };
    }
    case "monthly": {
      const firstDay = new Date(y, m, 1);
      const lastDay = new Date(y, m + 1, 0);
      return {
        startDate: formatDateStr(firstDay),
        endDate: formatDateStr(lastDay),
      };
    }
    case "annually": {
      const firstDay = new Date(y, 0, 1);
      const lastDay = new Date(y, 11, 31);
      return {
        startDate: formatDateStr(firstDay),
        endDate: formatDateStr(lastDay),
      };
    }
  }
}

interface ExpenseFormState {
  amount: string;
  category: string;
  customCategory: string;
  branchId: string;
  date: string;
  description: string;
}

const EMPTY_FORM: ExpenseFormState = {
  amount: "",
  category: "Inventory / Operations",
  customCategory: "",
  branchId: "",
  date: formatDateStr(new Date()),
  description: "",
};

export default function ExpensesPage() {
  const router = useRouter();
  const { user, isLoading: isSessionLoading } = useSessionContext();
  const dialog = useGlobalDialog();

  // Role Gate: Only Admin/Owner can access
  useEffect(() => {
    if (!isSessionLoading && user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isSessionLoading, router]);

  // Filter states
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [selectedCategory, setSelectedCategory] = useState<string>("ALL");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [searchQuery, setSearchQuery] = useState<string>("");

  // Modals
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [editingExpense, setEditingExpense] = useState<ExpenseWithDetails | null>(null);
  const [viewingExpense, setViewingExpense] = useState<ExpenseWithDetails | null>(null);
  const [formData, setFormData] = useState<ExpenseFormState>(EMPTY_FORM);

  // Queries & Mutations
  const { data: branchesData } = useBranchesQuery();
  const branches = branchesData?.branches || [];

  const { data, isLoading } = useExpensesQuery({
    branchId: selectedBranch || undefined,
    category: selectedCategory !== "ALL" ? selectedCategory : undefined,
    startDate: startDate || undefined,
    endDate: endDate || undefined,
    search: searchQuery || undefined,
  });

  const expensesList = data?.expenses || [];
  const summary = data?.summary || {
    totalExpenses: 0,
    todayExpenses: 0,
    monthExpenses: 0,
    recordCount: 0,
  };

  const createMutation = useCreateExpenseMutation();
  const updateMutation = useUpdateExpenseMutation();
  const deleteMutation = useDeleteExpenseMutation();
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedExpenses,
  } = usePagination(expensesList, 10);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedBranch, selectedCategory, startDate, endDate, searchQuery]);

  const currentActivePreset = useMemo(() => {
    if (!startDate || !endDate) return null;
    const presets: DatePreset[] = ["daily", "weekly", "monthly", "annually"];
    for (const p of presets) {
      const range = getPresetDateRange(p);
      if (startDate === range.startDate && endDate === range.endDate) {
        return p;
      }
    }
    return null;
  }, [startDate, endDate]);

  const handlePresetSelect = (preset: DatePreset) => {
    if (currentActivePreset === preset) {
      setStartDate("");
      setEndDate("");
    } else {
      const { startDate: start, endDate: end } = getPresetDateRange(preset);
      setStartDate(start);
      setEndDate(end);
    }
  };

  const hasActiveFilters = Boolean(
    startDate || endDate || selectedBranch || selectedCategory !== "ALL" || searchQuery
  );

  const handleResetFilters = () => {
    setSelectedBranch("");
    setSelectedCategory("ALL");
    setStartDate("");
    setEndDate("");
    setSearchQuery("");
  };

  // Open Add Dialog
  const handleOpenAdd = () => {
    setFormData({
      ...EMPTY_FORM,
      date: formatDateStr(new Date()),
    });
    setEditingExpense(null);
    setIsAddOpen(true);
  };

  // Open Edit Dialog
  const handleOpenEdit = (expense: ExpenseWithDetails) => {
    setEditingExpense(expense);
    const isStandardCategory = EXPENSE_CATEGORIES.includes(expense.category);
    setFormData({
      amount: String(expense.amount),
      category: isStandardCategory ? expense.category : "Custom",
      customCategory: isStandardCategory ? "" : expense.category,
      branchId: expense.branchId ? String(expense.branchId) : "",
      date: expense.date ? formatDateStr(new Date(expense.date)) : formatDateStr(new Date()),
      description: expense.description || "",
    });
    setIsAddOpen(true);
  };

  // Submit Add / Edit
  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountVal = Number(formData.amount);
    if (!amountVal || amountVal <= 0) {
      dialog.show({ title: "Validation Error", message: "Please enter a valid expense amount greater than 0", type: "error" });
      return;
    }

    const resolvedCategory =
      formData.category === "Custom"
        ? formData.customCategory.trim()
        : formData.category.trim();

    if (!resolvedCategory) {
      dialog.show({ title: "Validation Error", message: "Please specify an expense category", type: "error" });
      return;
    }

    try {
      if (editingExpense) {
        await updateMutation.mutateAsync({
          expenseId: editingExpense.expenseId,
          data: {
            amount: Math.round(amountVal),
            category: resolvedCategory,
            description: formData.description.trim() || undefined,
            branchId: formData.branchId ? Number(formData.branchId) : null,
            date: formData.date ? new Date(formData.date) : new Date(),
          },
        });
        dialog.show({ title: "Success", message: "Expense updated successfully", type: "success" });
      } else {
        await createMutation.mutateAsync({
          amount: Math.round(amountVal),
          category: resolvedCategory,
          description: formData.description.trim() || undefined,
          branchId: formData.branchId ? Number(formData.branchId) : null,
          date: formData.date ? new Date(formData.date) : new Date(),
        });
        dialog.show({ title: "Success", message: "Expense logged successfully", type: "success" });
      }
      setIsAddOpen(false);
      setEditingExpense(null);
    } catch (err: any) {
      dialog.show({ title: "Error", message: err.message || "Failed to save expense", type: "error" });
    }
  };

  // Delete
  const handleDelete = (expense: ExpenseWithDetails) => {
    dialog.show({
      title: "Delete Expense Record",
      message: `Are you sure you want to permanently delete this ${formatPeso(expense.amount)} expense record (${expense.category})?`,
      type: "confirm",
      confirmLabel: "Delete",
      confirmVariant: "destructive",
      onConfirm: async () => {
        try {
          await deleteMutation.mutateAsync(expense.expenseId);
          dialog.show({ title: "Deleted", message: "Expense record has been deleted", type: "success" });
        } catch (err: any) {
          dialog.show({ title: "Error", message: err.message || "Failed to delete expense", type: "error" });
        }
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Expense Records
          </h1>
        </div>
        <Button
          onClick={handleOpenAdd}
          variant="primary"
          size="sm"
          className="gap-2 text-sm font-semibold h-10"
        >
          <Plus size={16} />
          <span>Add Expense</span>
        </Button>
      </div>

      {/* Summary Metrics Grid (4 Cards styled identically to Sales) */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-bold text-red-600 dark:text-zinc-100">
              {`-` + formatPeso(summary.totalExpenses)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Matching current filters</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">This Month</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {formatPeso(summary.monthExpenses)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Recorded this month</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Today's Expenses</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {formatPeso(summary.todayExpenses)}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Recorded today</p>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
          <CardHeader className="pb-1 pt-4 px-4">
            <CardTitle className="text-xs font-medium text-zinc-500">Total Records</CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4">
            <div className="text-xl font-semibold text-zinc-900 dark:text-zinc-100">
              {summary.recordCount}
            </div>
            <p className="text-[11px] text-zinc-500 mt-0.5">Expense entries</p>
          </CardContent>
        </Card>
      </div>

      {/* Filter Bar (Styled identically to Sales module) */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900">
        <CardContent className="p-4 space-y-3">
          {/* Preset Buttons & Reset Filter */}
          <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-zinc-100 dark:border-zinc-800">
            <div className="flex items-center gap-1.5 flex-wrap">
              {(
                [
                  { id: "daily", label: "Daily" },
                  { id: "weekly", label: "Weekly" },
                  { id: "monthly", label: "Monthly" },
                  { id: "annually", label: "Annually" },
                ] as const
              ).map((preset) => {
                const isActive = currentActivePreset === preset.id;
                return (
                  <Button
                    key={preset.id}
                    type="button"
                    size="xs"
                    variant={isActive ? "primary" : "outline"}
                    onClick={() => handlePresetSelect(preset.id)}
                    className={
                      isActive
                        ? "shadow-sm font-semibold"
                        : "text-zinc-600 dark:text-zinc-300 hover:text-zinc-900 dark:hover:text-zinc-100"
                    }
                  >
                    {preset.label}
                  </Button>
                );
              })}
            </div>

            {hasActiveFilters && (
              <Button
                type="button"
                variant="ghost"
                size="xs"
                onClick={handleResetFilters}
                className="text-xs text-red-600 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 hover:bg-red-50 dark:hover:bg-red-950/30 font-medium"
              >
                <RotateCcw className="w-3.5 h-3.5 mr-1" />
                Reset Filters
              </Button>
            )}
          </div>

          {/* Form Filter Row */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
            {/* Search Input */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Search</label>
              <div className="relative">
                <Search size={14} className="absolute left-2.5 top-2.5 text-zinc-400" />
                <Input
                  type="text"
                  placeholder="Notes, category, user..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-8 h-9 text-xs"
                />
              </div>
            </div>

            {/* Branch Filter */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Branch</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedBranch}
                onChange={(e) => setSelectedBranch(e.target.value)}
              >
                <option value="">All Branches & Central</option>
                <option value="central">Central / Warehouse (No Branch)</option>
                {branches.map((b) => (
                  <option key={b.branchId} value={String(b.branchId)}>
                    {b.branchName}
                  </option>
                ))}
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1">Category</label>
              <select
                className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
              >
                <option value="ALL">All Categories</option>
                {EXPENSE_CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>

            {/* Date Range Start */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1">From</label>
              <DatePicker
                value={startDate}
                onChange={setStartDate}
                placeholder="Start Date"
                className="h-9 text-xs"
              />
            </div>

            {/* Date Range End */}
            <div>
              <label className="text-xs text-zinc-500 block mb-1">To</label>
              <DatePicker
                value={endDate}
                onChange={setEndDate}
                placeholder="End Date"
                className="h-9 text-xs"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Expenses Table Card (Styled identically to Sales & Users modules) */}
      <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 overflow-hidden">
        <CardContent className="p-0">
          {isLoading ? (
            <p className="text-xs text-zinc-500 py-6 text-center">Loading expenses...</p>
          ) : expensesList.length === 0 ? (
            <p className="text-xs text-zinc-500 py-6 text-center">
              No expense records found matching the filters.
            </p>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50 text-left text-zinc-600 dark:text-zinc-400">
                      <th className="py-3 px-4 font-semibold">Date</th>
                      <th className="py-3 px-4 font-semibold">Branch & Staff</th>
                      <th className="py-3 px-4 font-semibold">Category</th>
                      <th className="py-3 px-4 font-semibold">Description / Remarks</th>
                      <th className="py-3 px-4 font-semibold text-right">Amount</th>
                      <th className="py-3 px-4 font-semibold text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-zinc-100 dark:divide-zinc-800">
                    {paginatedExpenses.map((exp) => {
                      return (
                        <tr
                          key={exp.expenseId}
                          className="hover:bg-zinc-50 dark:hover:bg-zinc-800/40 transition-colors"
                        >
                          {/* Date */}
                          <td className="py-3 px-4 text-zinc-500 font-mono text-xs whitespace-nowrap">
                            {new Date(exp.date).toLocaleDateString("en-PH", {
                              month: "short",
                              day: "numeric",
                              year: "numeric",
                            })}
                          </td>

                          {/* Branch & Staff (matching Sales table column structure) */}
                          <td className="py-3 px-4 text-zinc-900 dark:text-zinc-100 font-semibold">
                            <span>
                              <p className="font-bold">
                                {exp.branchName || "Central / Warehouse"}
                              </p>
                              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                                {exp.userName} ({exp.userRole})
                              </p>
                            </span>
                          </td>

                          {/* Category */}
                          <td className="py-3 px-4 whitespace-nowrap">
                            <Badge
                              variant="outline"
                              className="text-xs font-semibold px-2 py-0.5 border-zinc-200 dark:border-zinc-700 bg-zinc-50 dark:bg-zinc-800/60 text-zinc-700 dark:text-zinc-300"
                            >
                              {exp.category}
                            </Badge>
                          </td>

                          {/* Description */}
                          <td className="py-3 px-4 text-zinc-600 dark:text-zinc-400 max-w-xs font-medium">
                            {exp.description || "—"}
                          </td>

                          {/* Amount */}
                          <td className="py-3 px-4 text-right font-semibold text-zinc-900 dark:text-zinc-100 font-mono whitespace-nowrap">
                            -{formatPeso(exp.amount)}
                          </td>

                          {/* Actions */}
                          <td className="py-3 px-4 text-center whitespace-nowrap">
                            <div className="flex items-center justify-center gap-1">
                              <ActionTooltip label="View Details">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => setViewingExpense(exp)}
                                  aria-label="View Details"
                                >
                                  <Eye size={15} />
                                </Button>
                              </ActionTooltip>
                              <ActionTooltip label="Edit Expense">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleOpenEdit(exp)}
                                  aria-label="Edit Expense"
                                >
                                  <Pen size={15} />
                                </Button>
                              </ActionTooltip>
                              <ActionTooltip label="Delete Expense">
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  onClick={() => handleDelete(exp)}
                                  className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/40"
                                  aria-label="Delete Expense"
                                >
                                  <Trash2 size={15} />
                                </Button>
                              </ActionTooltip>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              <div className="p-3 border-t border-zinc-200 dark:border-zinc-800">
                <TablePagination
                  currentPage={currentPage}
                  pageSize={pageSize}
                  totalItems={totalItems}
                  onPageChange={setCurrentPage}
                  onPageSizeChange={setPageSize}
                />
              </div>
            </>
          )}
        </CardContent>
      </Card>

      {/* Add / Edit Expense Dialog (Standard Dialog matching Users and Salary dialogs) */}
      <Dialog open={isAddOpen} onOpenChange={setIsAddOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={handleSubmitForm}>
            <DialogHeader>
              <DialogTitle className="text-xl font-bold">
                {editingExpense ? "Edit Expense Record" : "Add Expense Record"}
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-3 text-sm">
              {/* Amount */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Amount (₱) <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="1"
                  step="1"
                  required
                  placeholder="0"
                  value={formData.amount}
                  onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                  className="font-mono text-base font-bold"
                />
              </div>

              {/* Category */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Category <span className="text-red-500">*</span>
                </label>
                <select
                  value={formData.category}
                  onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  {EXPENSE_CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                  <option value="Custom">Other (Custom Category)</option>
                </select>
              </div>

              {formData.category === "Custom" && (
                <div>
                  <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                    Custom Category Name <span className="text-red-500">*</span>
                  </label>
                  <Input
                    type="text"
                    required
                    placeholder="Enter custom category"
                    value={formData.customCategory}
                    onChange={(e) =>
                      setFormData({ ...formData, customCategory: e.target.value })
                    }
                  />
                </div>
              )}

              {/* Branch */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Branch
                </label>
                <select
                  value={formData.branchId}
                  onChange={(e) => setFormData({ ...formData, branchId: e.target.value })}
                  className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <option value="">Central / Warehouse / General (No Branch)</option>
                  {branches.map((b) => (
                    <option key={b.branchId} value={String(b.branchId)}>
                      {b.branchName}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Date
                </label>
                <Input
                  type="date"
                  required
                  value={formData.date}
                  onChange={(e) => setFormData({ ...formData, date: e.target.value })}
                />
              </div>

              {/* Description */}
              <div>
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Description / Remarks
                </label>
                <textarea
                  rows={3}
                  placeholder="Additional expense details, items purchased, receipts..."
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="w-full rounded-md border border-input bg-background p-2.5 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
              </div>
            </div>

            <DialogFooter className="gap-2 pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setIsAddOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSaving}
              >
                {isSaving
                  ? "Saving..."
                  : editingExpense
                  ? "Save Changes"
                  : "Create Expense"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Details Dialog (Styled like Sales Details Dialog) */}
      {viewingExpense && (
        <Dialog open={!!viewingExpense} onOpenChange={() => setViewingExpense(null)}>
          <DialogContent className="sm:max-w-md">
            <DialogHeader>
              <DialogTitle className="text-xl font-bold flex items-center justify-between">
                <span>Expense Details</span>
                <span className="font-mono text-lg font-bold text-red-600">
                  -{formatPeso(viewingExpense.amount)}
                </span>
              </DialogTitle>
            </DialogHeader>

            <div className="space-y-4 py-2 text-xs">
              <div className="space-y-2 border-b border-zinc-100 dark:border-zinc-800 pb-3">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Category</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {viewingExpense.category}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Branch</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {viewingExpense.branchName || "Central / Warehouse"}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Recorded By</span>
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                    {viewingExpense.userName} ({viewingExpense.userRole})
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-zinc-500">Date</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-100">
                    {new Date(viewingExpense.date).toLocaleDateString("en-PH", {
                      month: "short",
                      day: "numeric",
                      year: "numeric",
                    })}
                  </span>
                </div>
                {viewingExpense.sessionId && (
                  <div className="flex justify-between">
                    <span className="text-zinc-500">Shift Session</span>
                    <span className="font-mono text-zinc-600 dark:text-zinc-400">
                      #{viewingExpense.sessionId}
                    </span>
                  </div>
                )}
              </div>

              <div>
                <span className="font-semibold text-zinc-700 dark:text-zinc-300 block mb-1">
                  Description / Remarks
                </span>
                <div className="p-3 bg-zinc-50 dark:bg-zinc-800/50 rounded-md border border-zinc-200 dark:border-zinc-800 text-zinc-700 dark:text-zinc-300">
                  {viewingExpense.description || "No remarks provided."}
                </div>
              </div>
            </div>

            <DialogFooter className="pt-2 border-t border-zinc-100 dark:border-zinc-800">
              <Button
                variant="tertiary"
                onClick={() => setViewingExpense(null)}
              >
                Close
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
