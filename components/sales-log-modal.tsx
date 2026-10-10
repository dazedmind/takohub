"use client";

import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { useSalaryMatrixQuery } from "@/lib/queries";
import {
  calculatePlatesSold,
  calculateTotalSales,
  calculateSalary,
  calculateSalaryFromMatrix,
  formatPeso,
} from "@/lib/business-logic";
import type { ActiveEmployeeShift } from "@/lib/types";

interface SalesLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (endedSessionId?: number) => void;
  activeShift: ActiveEmployeeShift | null;
  userRole?: string;
}

export function SalesLogModal({
  isOpen,
  onClose,
  onSuccess,
  activeShift,
  userRole,
}: SalesLogModalProps) {
  const isIM = userRole === "IM" || activeShift?.role === "IM";
  const isBS = userRole === "BS" || activeShift?.role === "BS";
  const dialog = useGlobalDialog();

  // Branch Seller Sales Fields
  const [cheese, setCheese] = useState<string>("");
  const [octobits, setOctobits] = useState<string>("");
  const [crab, setCrab] = useState<string>("");
  const [cashOnhand, setCashOnhand] = useState<string>("");
  const [expenses, setExpenses] = useState<string>("");
  const [gcashPayment, setGcashPayment] = useState<string>("");
  const [free, setFree] = useState<string>("");
  const [shortVal, setShortVal] = useState<string>("");
  const [overVal, setOverVal] = useState<string>("");
  const [trashLeftover, setTrashLeftover] = useState<string>("");
  const [remarks, setRemarks] = useState<string>("");

  const shortOver = useMemo(() => {
    return String((Number(shortVal) || 0) - (Number(overVal) || 0));
  }, [shortVal, overVal]);

  // Inventory Manager EOD Report & Expense Fields
  const [eodReport, setEodReport] = useState<string>("");
  const [imExpenses, setImExpenses] = useState<string>("0");
  const [imExpenseCategory, setImExpenseCategory] = useState<string>("Inventory / Operations");
  const [imExpenseNotes, setImExpenseNotes] = useState<string>("");

  const [isSubmitting, setIsSubmitting] = useState(false);

  const totalPlatesSold = useMemo(() => {
    return calculatePlatesSold({
      cheese: Number(cheese) || 0,
      octobits: Number(octobits) || 0,
      crab: Number(crab) || 0,
    });
  }, [cheese, octobits, crab]);

  const totalSales = useMemo(() => {
    return calculateTotalSales(totalPlatesSold);
  }, [totalPlatesSold]);

  const { data: salaryMatrixData } = useSalaryMatrixQuery();

  const calculatedSalary = useMemo(() => {
    return calculateSalaryFromMatrix(totalPlatesSold, salaryMatrixData?.tiers);
  }, [totalPlatesSold, salaryMatrixData?.tiers]);

  // const tallyDiffers = useMemo(() => {
  //   return (Number(cashOnhand) || 0) + (Number(gcashPayment) || 0) !== totalSales;
  // }, [cashOnhand, gcashPayment, totalSales]);

  const isValid = useMemo(() => {
    if (isIM) {
      return Number(imExpenses) >= 0;
    }
    return (
      Number(cheese) >= 0 &&
      Number(octobits) >= 0 &&
      Number(crab) >= 0 &&
      Number(cashOnhand) > 0 &&
      Number(expenses) >= 0 &&
      Number(gcashPayment) >= 0 &&
      Number(free) >= 0 &&
      Number(trashLeftover) >= 0 &&
      Number(shortVal) >= 0 &&
      Number(overVal) >= 0
      // !tallyDiffers
    );
  }, [isIM, imExpenses, cheese, octobits, crab, cashOnhand, expenses, gcashPayment, free, trashLeftover, shortVal, overVal]);

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      dialog.show({ title: "Error", message: "No active shift found", type: "error" });
      return;
    }

    if (isIM && eodReport.trim() === "") {
      dialog.show({ title: "Verification Required", message: "Please provide an EOD report or notes", type: "error" });
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = isIM
        ? {
            sessionId: activeShift.sessionId,
            eodReport: eodReport.trim(),
            expenses: Math.max(0, Number(imExpenses) || 0),
            expenseCategory: imExpenseCategory,
            expenseNotes: imExpenseNotes.trim(),
            cheese: 0,
            octobits: 0,
            crab: 0,
            cashOnhand: 0,
            gcashPayment: 0,
            free: 0,
            shortOver: 0,
          }
        : {
            sessionId: activeShift.sessionId,
            cheese: Number(cheese) || 0,
            octobits: Number(octobits) || 0,
            crab: Number(crab) || 0,
            cashOnhand: Number(cashOnhand) || 0,
            expenses: Number(expenses) || 0,
            gcashPayment: Number(gcashPayment) || 0,
            free: Number(free) || 0,
            shortOver: Number(shortOver) || 0,
            trashLeftover: Number(trashLeftover) || 0,
            remarks: remarks.trim(),
          };

      const response = await fetch("/api/attendance/end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to end shift");
      }

      const endedSessionId = activeShift.sessionId;
      // Close modal and notify immediately so shift is removed without delay
      onClose();
      onSuccess(endedSessionId);

      dialog.show({
        title: "Success",
        message: isIM ? "Shift ended with EOD Report." : "Shift ended with Sales Log.",
        type: "success",
      });
    } catch (error) {
      dialog.show({
        title: "Error",
        message: error instanceof Error ? error.message : "Error ending shift",
        type: "error"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleEndShift}>
          <DialogHeader>
            <DialogTitle className="text-xl font-bold">
              {isIM ? "End Shift — EOD Report" : "Log Sales & End Shift"}
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-5 py-3">
            {/* INVENTORY MANAGER VIEW: EOD REPORT ONLY */}
            {isIM ? (
              <div className="space-y-4">

                <div>
                  <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                    End of Day (EOD) Report / Notes <span className="text-red-500">*</span>
                  </label>
                  <textarea
                    rows={4}
                    value={eodReport}
                    onChange={(e) => setEodReport(e.target.value)}
                    placeholder="e.g. Received 50kg tako mix from supplier, audited branch 2 stock, all central warehouse items counted."
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>

                {/* IM Shift Expenses */}
                <div className="space-y-3 pt-3 border-t border-zinc-200 dark:border-zinc-800">
                  <div>
                    <h3 className="text-xs font-bold uppercase text-yellow-600 dark:text-zinc-300 tracking-wider">
                      Shift Expenses (Optional)
                    </h3>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Amount (₱)
                      </label>
                      <Input
                        type="number"
                        min="0"
                        step="1"
                        value={imExpenses}
                        onChange={(e) => setImExpenses(e.target.value)}
                        placeholder="0"
                        className="h-9 text-sm"
                      />
                    </div>
                    <div>
                      <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Category
                      </label>
                      <select
                        value={imExpenseCategory}
                        onChange={(e) => setImExpenseCategory(e.target.value)}
                        className="flex h-9 w-full rounded-md border border-input bg-background px-3 text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                      >
                        <option value="Inventory / Operations">Inventory / Operations</option>
                        <option value="Supplies & Packaging">Supplies & Packaging</option>
                        <option value="Transportation / Logistics">Transportation / Logistics</option>
                        <option value="Maintenance / Repairs">Maintenance / Repairs</option>
                        <option value="Miscellaneous">Miscellaneous</option>
                      </select>
                    </div>
                  </div>

                  <div>
                    <label className="text-xs font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                      Expense Description / Remarks (Optional)
                    </label>
                    <Input
                      type="text"
                      value={imExpenseNotes}
                      onChange={(e) => setImExpenseNotes(e.target.value)}
                      placeholder="e.g. Purchased cargo tape and warehouse cleaning supplies"
                      className="h-9 text-xs"
                    />
                  </div>
                </div>
              </div>
            ) : (
              /* BRANCH SELLER VIEW: PLATES & SALES LOG */
              <div className="space-y-5 text-sm">
                {/* Autocomputed Summary (2-column layout) */}
                <div className="space-y-3">              
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Total Plates Sold</span>
                      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPlatesSold} plates
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Sales Revenue</span>
                      <span className="text-xl font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPeso(totalSales)}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 col-span-2">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Your Salary</span>
                      <span className="text-xl font-bold text-zinc-900 dark:text-zinc-100">
                        {formatPeso(calculatedSalary)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plates Sold (1-column layout) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-yellow-600 dark:text-zinc-300 tracking-wider">
                    Plates Sold
                  </h3>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Cheese (qty)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={cheese}
                        onChange={(e) => setCheese(e.target.value)}
                        className="font-semibold text-base text-center h-11"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Octobits (qty)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={octobits}
                        onChange={(e) => setOctobits(e.target.value)}
                        className="font-semibold text-base text-center h-11"
                        placeholder="0"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Crab (qty)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={crab}
                        onChange={(e) => setCrab(e.target.value)}
                        className="font-semibold text-base text-center h-11"
                        placeholder="0"
                      />
                    </div>
                  </div>
                </div>

                {/* Cash & Operations (1-column layout) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-yellow-600 dark:text-zinc-300 tracking-wider">
                    Operations
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex gap-3 items-center">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Cash on Hand
                      </label>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={cashOnhand}
                          onChange={(e) => setCashOnhand(e.target.value)}
                          required
                          className="pl-7 h-10 text-sm font-semibold w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        GCash Payments
                      </label>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={gcashPayment}
                          onChange={(e) => setGcashPayment(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Expenses
                      </label>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={expenses}
                          onChange={(e) => setExpenses(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Free B-Box
                      </label>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={free}
                          onChange={(e) => setFree(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="w-full flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Short
                        </label>
                        <span className="text-red-500 font-bold text-xl mr-2">-</span>
                      </div>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={shortVal}
                          onChange={(e) => setShortVal(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full font-mono text-red-600"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <div className="w-full flex items-center justify-between">
                        <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
                          Over
                        </label>
                        <span className="text-emerald-500 font-bold text-xl mr-2">+</span>
                      </div>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={overVal}
                          onChange={(e) => setOverVal(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full font-mono text-emerald-600"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="flex gap-3 items-center">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Trash / Left Over
                      </label>
                      <div className="relative w-1/3">
                        <span className="absolute left-3 top-2.5 text-zinc-400 text-sm">₱</span>
                        <Input
                          type="number"
                          min={0}
                          value={trashLeftover}
                          onChange={(e) => setTrashLeftover(e.target.value)}
                          className="pl-7 h-10 text-sm font-semibold w-full"
                          placeholder="0"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5 pt-2">
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block">
                        Remarks
                      </label>
                      <textarea
                        value={remarks}
                        onChange={(e) => setRemarks(e.target.value)}
                        placeholder="Additional remarks or notes..."
                        className="h-20 text-sm w-full border border-zinc-200 dark:border-zinc-800 rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-ring bg-white dark:bg-zinc-900"
                      />
                    </div>

                    {/* {tallyDiffers && (
                      <div className="p-3 bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-lg text-xs text-amber-700 dark:text-amber-400 font-medium">
                        The sum of Cash on Hand ({formatPeso(Number(cashOnhand) || 0)}) and GCash Payments ({formatPeso(Number(gcashPayment) || 0)}) is {formatPeso((Number(cashOnhand) || 0) + (Number(gcashPayment) || 0))}, which does not match the Sales Revenue of {formatPeso(totalSales)}.
                      </div>
                    )} */}
                  </div>
                </div>
              </div>
            )}
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-3 border-t border-zinc-200 dark:border-zinc-800">
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-10 text-sm"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={!isValid || isSubmitting}
              className="h-10 text-sm font-semibold"
            >
              {isSubmitting ? "Submitting..." : "End Current Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
