"use client";

import { useState, useMemo, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Banknote,
  Calculator,
  Pen,
  Plus,
  RotateCcw,
  ShieldAlert,
  Trash2,
  TrendingUp,
  Layers,
} from "lucide-react";
import { ActionTooltip } from "@/components/ui/tooltip";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { useSessionContext } from "@/components/providers/session-provider";
import {
  useSalaryMatrixQuery,
  useCreateSalaryTierMutation,
  useUpdateSalaryTierMutation,
  useDeleteSalaryTierMutation,
  useResetSalaryMatrixMutation,
} from "@/lib/queries";
import {
  formatPeso,
  calculateSalaryFromMatrix,
} from "@/lib/business-logic";
import type { SalaryTier, CreateSalaryTierInput } from "@/lib/types";
import { TablePagination, usePagination } from "@/components/ui/table-pagination";

interface FormState {
  minPlates: string;
  maxPlates: string;
  isUnbounded: boolean;
  salary: string;
  description: string;
}

const EMPTY_FORM: FormState = {
  minPlates: "",
  maxPlates: "",
  isUnbounded: false,
  salary: "",
  description: "",
};

export default function SalaryPage() {
  const router = useRouter();
  const { user, isLoading: isSessionLoading } = useSessionContext();
  const dialog = useGlobalDialog();

  // Role Gate: Only Admin/Owner can access
  useEffect(() => {
    if (!isSessionLoading && user && user.role !== "ADMIN") {
      router.replace("/dashboard");
    }
  }, [user, isSessionLoading, router]);

  const { data, isLoading } = useSalaryMatrixQuery();
  const tiers = data?.tiers || [];

  const {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize,
    totalItems,
    paginatedItems: paginatedTiers,
  } = usePagination(tiers, 10);

  const createMutation = useCreateSalaryTierMutation();
  const updateMutation = useUpdateSalaryTierMutation();
  const deleteMutation = useDeleteSalaryTierMutation();
  const resetMutation = useResetSalaryMatrixMutation();

  // Dialog State
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingTier, setEditingTier] = useState<SalaryTier | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);

  // Live Calculator Tester State
  const [testPlates, setTestPlates] = useState<number>(25);

  const calculatedSalary = useMemo(() => {
    return calculateSalaryFromMatrix(testPlates, tiers);
  }, [testPlates, tiers]);

  // Statistics
  const minSalary = useMemo(() => {
    if (tiers.length === 0) return 0;
    return Math.min(...tiers.map((t) => t.salary));
  }, [tiers]);

  const maxSalary = useMemo(() => {
    if (tiers.length === 0) return 0;
    return Math.max(...tiers.map((t) => t.salary));
  }, [tiers]);

  const openCreate = () => {
    setEditingTier(null);
    // Suggest the next minPlates based on current maximum
    const highestMax = tiers.reduce((max, t) => {
      if (t.maxPlates === null) return max;
      return Math.max(max, t.maxPlates);
    }, 0);

    setForm({
      minPlates: highestMax > 0 ? String(highestMax + 1) : "1",
      maxPlates: "",
      isUnbounded: false,
      salary: "",
      description: "",
    });
    setDialogOpen(true);
  };

  const openEdit = (tier: SalaryTier) => {
    setEditingTier(tier);
    setForm({
      minPlates: String(tier.minPlates),
      maxPlates: tier.maxPlates !== null ? String(tier.maxPlates) : "",
      isUnbounded: tier.maxPlates === null,
      salary: String(tier.salary),
      description: tier.description || "",
    });
    setDialogOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    const min = parseInt(form.minPlates, 10);
    const max = form.isUnbounded ? null : parseInt(form.maxPlates, 10);
    const salaryVal = parseInt(form.salary, 10);

    if (isNaN(min) || min < 0) {
      dialog.show({
        title: "Validation Error",
        message: "Please enter a valid minimum plates sold (0 or greater).",
        type: "error",
      });
      return;
    }

    if (!form.isUnbounded && (isNaN(max as number) || (max as number) < min)) {
      dialog.show({
        title: "Validation Error",
        message: "Maximum plates must be a number greater than or equal to minimum plates.",
        type: "error",
      });
      return;
    }

    if (isNaN(salaryVal) || salaryVal < 0) {
      dialog.show({
        title: "Validation Error",
        message: "Please enter a valid salary amount in pesos.",
        type: "error",
      });
      return;
    }

    try {
      if (editingTier) {
        await updateMutation.mutateAsync({
          tierId: editingTier.tierId,
          data: {
            minPlates: min,
            maxPlates: max,
            salary: salaryVal,
            description: form.description.trim() || undefined,
          },
        });
        dialog.show({
          title: "Success",
          message: "Salary tier updated successfully.",
          type: "success",
        });
      } else {
        await createMutation.mutateAsync({
          minPlates: min,
          maxPlates: max,
          salary: salaryVal,
          description: form.description.trim() || undefined,
        });
        dialog.show({
          title: "Success",
          message: "New salary tier added successfully.",
          type: "success",
        });
      }
      setDialogOpen(false);
    } catch (err) {
      dialog.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to save salary tier",
        type: "error",
      });
    }
  };

  const handleDelete = async (tier: SalaryTier) => {
    const rangeText =
      tier.maxPlates !== null
        ? `${tier.minPlates}–${tier.maxPlates} plates`
        : `${tier.minPlates}+ plates`;

    if (
      !confirm(
        `Are you sure you want to delete this salary tier (${rangeText} = ${formatPeso(
          tier.salary
        )})?`
      )
    ) {
      return;
    }

    try {
      await deleteMutation.mutateAsync(tier.tierId);
      dialog.show({
        title: "Success",
        message: "Salary tier deleted successfully.",
        type: "success",
      });
    } catch (err) {
      dialog.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to delete tier",
        type: "error",
      });
    }
  };

  const handleResetToDefault = async () => {
    if (
      !confirm(
        "Are you sure you want to reset the salary matrix back to standard 13-tier defaults? Any custom tiers will be replaced."
      )
    ) {
      return;
    }

    try {
      await resetMutation.mutateAsync();
      dialog.show({
        title: "Success",
        message: "Salary matrix has been reset to the default 13-tier matrix.",
        type: "success",
      });
    } catch (err) {
      dialog.show({
        title: "Error",
        message: err instanceof Error ? err.message : "Failed to reset salary matrix",
        type: "error",
      });
    }
  };

  // Prevent unauthorized render
  if (isSessionLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <p className="text-zinc-500 font-medium">Loading session...</p>
      </div>
    );
  }

  if (user && user.role !== "ADMIN") {
    return (
      <div className="flex flex-col items-center justify-center h-96 gap-4 text-center">
        <ShieldAlert size={48} className="text-red-500" />
        <h2 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
          Access Restricted
        </h2>
        <p className="text-sm text-zinc-500 max-w-sm">
          The Salary Matrix module is only accessible to Admin / Owner accounts.
        </p>
        <Button onClick={() => router.replace("/dashboard")} variant="default">
          Back to Dashboard
        </Button>
      </div>
    );
  }

  const isSaving = createMutation.isPending || updateMutation.isPending;

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-zinc-200 dark:border-zinc-800">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-zinc-900 dark:text-zinc-100">
            Salary Matrix
          </h1>
          <p className="text-sm text-zinc-500">
            Configure and adjust the salary tiers based on plates sold
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            onClick={handleResetToDefault}
            variant="tertiary"
            size="sm"
            disabled={resetMutation.isPending}
            className="text-xs font-semibold"
          >
            <RotateCcw size={14} className="mr-1.5" />
            {resetMutation.isPending ? "Resetting..." : "Reset to Defaults"}
          </Button>
          <Button
            onClick={openCreate}
            variant="primary"
            size="sm"
            className="gap-1.5 text-xs font-semibold h-9"
          >
            <Plus size={15} />
            <span>Add New Tier</span>
          </Button>
        </div>
      </div>

      {/* Overview Cards & Interactive Calculator Tester */}
      {/* <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-orange-100 dark:bg-orange-950/60 text-orange-600 dark:text-orange-400">
              <Layers size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Configured Tiers</p>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                {tiers.length} {tiers.length === 1 ? "tier" : "tiers"}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400">
              <Banknote size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Min Tier Salary</p>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {formatPeso(minSalary)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950">
          <CardContent className="p-4 flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-100 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400">
              <TrendingUp size={20} />
            </div>
            <div>
              <p className="text-xs text-zinc-500 font-medium">Max Tier Salary</p>
              <h3 className="text-xl font-bold text-zinc-900 dark:text-zinc-100 font-mono">
                {formatPeso(maxSalary)}
              </h3>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-orange-200 dark:border-orange-900/50 bg-orange-50/50 dark:bg-orange-950/20">
          <CardContent className="p-3.5 space-y-2">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-orange-700 dark:text-orange-400">
                <Calculator size={15} />
                <span className="text-xs font-bold uppercase tracking-wider">
                  Test Calculator
                </span>
              </div>
              <span className="text-xs text-zinc-500 font-mono">
                {testPlates} plates
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Input
                type="number"
                min="0"
                value={testPlates}
                onChange={(e) => setTestPlates(Math.max(0, parseInt(e.target.value, 10) || 0))}
                className="h-8 text-xs font-mono"
                placeholder="Plates sold"
              />
              <div className="text-right whitespace-nowrap">
                <span className="text-xs text-zinc-500 block">Salary:</span>
                <span className="text-sm font-bold text-orange-700 dark:text-orange-300 font-mono">
                  {formatPeso(calculatedSalary)}
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      </div> */}

      {/* Salary Tiers Table */}
      <Card className="border border-zinc-200 dark:border-zinc-800">
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="border-b border-zinc-200 dark:border-zinc-800 bg-zinc-50/50 dark:bg-zinc-900/50">
                <tr className="text-zinc-500 dark:text-zinc-400 font-medium text-xs">
                  <th className="py-3 px-4 w-16">#</th>
                  <th className="py-3 px-4">Plates Range</th>
                  <th className="py-3 px-4 text-center">Min Plates</th>
                  <th className="py-3 px-4 text-center">Max Plates</th>
                  <th className="py-3 px-4 text-right">Configured Salary</th>
                  {/* <th className="py-3 px-4">Description / Notes</th> */}
                  <th className="py-3 px-4 text-right w-28">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-500">
                      Loading salary matrix...
                    </td>
                  </tr>
                ) : tiers.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="text-center py-10 text-zinc-500">
                      No salary tiers configured yet. Click "Reset to Defaults" or "Add New Tier".
                    </td>
                  </tr>
                ) : (
                  paginatedTiers.map((tier, idx) => {
                    const isUnbounded = tier.maxPlates === null;
                    const rangeLabel = isUnbounded
                      ? `${tier.minPlates}+ plates`
                      : `${tier.minPlates}–${tier.maxPlates} plates`;

                    return (
                      <tr
                        key={tier.tierId}
                        className="hover:bg-zinc-50/80 dark:hover:bg-zinc-900/50 transition-colors"
                      >
                        <td className="py-3 px-4 text-xs font-mono text-zinc-400">
                          {(currentPage - 1) * pageSize + idx + 1}
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                            {rangeLabel}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs text-zinc-600 dark:text-zinc-300">
                          {tier.minPlates}
                        </td>
                        <td className="py-3 px-4 text-center font-mono text-xs">
                          {isUnbounded ? (
                            <Badge
                              variant="outline"
                              className="text-[10px] bg-zinc-100 dark:bg-zinc-800 font-sans"
                            >
                              No Limit
                            </Badge>
                          ) : (
                            <span className="text-zinc-600 dark:text-zinc-300">
                              {tier.maxPlates}
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-zinc-900 dark:text-zinc-100 text-base">
                          {formatPeso(tier.salary)}
                        </td>
                        {/* <td className="py-3 px-4 text-xs text-zinc-500 truncate max-w-xs">
                          {tier.description || "—"}
                        </td> */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <ActionTooltip label="Edit Tier">
                              <Button
                                size="sm"
                                variant="tertiary"
                                onClick={() => openEdit(tier)}
                                className="h-8 w-8 p-0"
                              >
                                <Pen size={14} />
                              </Button>
                            </ActionTooltip>
                            <ActionTooltip label="Delete Tier">
                              <Button
                                size="sm"
                                variant="tertiary"
                                onClick={() => handleDelete(tier)}
                                className="h-8 w-8 p-0 text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/50"
                              >
                                <Trash2 size={14} />
                              </Button>
                            </ActionTooltip>
                          </div>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
          <TablePagination
            currentPage={currentPage}
            pageSize={pageSize}
            totalItems={totalItems}
            onPageChange={setCurrentPage}
            onPageSizeChange={setPageSize}
          />
        </CardContent>
      </Card>

      {/* Add / Edit Tier Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editingTier ? "Edit Salary Tier" : "Add New Salary Tier"}
            </DialogTitle>
          </DialogHeader>

          <form onSubmit={handleSubmit} className="space-y-4 py-2">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Min Plates <span className="text-red-500">*</span>
                </label>
                <Input
                  type="number"
                  min="0"
                  required
                  placeholder="e.g. 1"
                  value={form.minPlates}
                  onChange={(e) => setForm({ ...form, minPlates: e.target.value })}
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                  Max Plates {!form.isUnbounded && <span className="text-red-500">*</span>}
                </label>
                <Input
                  type="number"
                  min="0"
                  disabled={form.isUnbounded}
                  placeholder={form.isUnbounded ? "No Limit" : "e.g. 5"}
                  value={form.isUnbounded ? "" : form.maxPlates}
                  onChange={(e) => setForm({ ...form, maxPlates: e.target.value })}
                />
              </div>
            </div>

            {/* Unbounded Checkbox */}
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="isUnbounded"
                checked={form.isUnbounded}
                onChange={(e) =>
                  setForm({
                    ...form,
                    isUnbounded: e.target.checked,
                    maxPlates: e.target.checked ? "" : form.maxPlates,
                  })
                }
                className="rounded border-zinc-300 text-orange-600 focus:ring-orange-500 h-4 w-4"
              />
              <label
                htmlFor="isUnbounded"
                className="text-xs text-zinc-600 dark:text-zinc-400 select-none cursor-pointer"
              >
                No upper limit (e.g. 60+ plates)
              </label>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Salary Amount (₱) <span className="text-red-500">*</span>
              </label>
              <Input
                type="number"
                min="0"
                step="10"
                required
                placeholder="e.g. 400"
                value={form.salary}
                onChange={(e) => setForm({ ...form, salary: e.target.value })}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
                Description / Notes <span className="text-zinc-400">(optional)</span>
              </label>
              <Input
                type="text"
                placeholder="e.g. Standard tier or includes ₱250 bonus"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="tertiary"
                onClick={() => setDialogOpen(false)}
                disabled={isSaving}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                variant="secondary"
                disabled={isSaving}
              >
                {isSaving ? "Saving..." : editingTier ? "Save Changes" : "Create Tier"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
