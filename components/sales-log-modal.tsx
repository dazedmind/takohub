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
import { toast } from "sonner";
import {
  calculatePlatesSold,
  calculateTotalSales,
  calculateSalary,
  formatPeso,
} from "@/lib/business-logic";
import type { ActiveEmployeeShift } from "@/lib/types";

interface SalesLogModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
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

  // Branch Seller Sales Fields
  const [cheese, setCheese] = useState<string>("0");
  const [octobits, setOctobits] = useState<string>("0");
  const [crab, setCrab] = useState<string>("0");
  const [cashOnhand, setCashOnhand] = useState<string>("0");
  const [expenses, setExpenses] = useState<string>("0");
  const [gcashPayment, setGcashPayment] = useState<string>("0");
  const [free, setFree] = useState<string>("0");
  const [shortOver, setShortOver] = useState<string>("0");
  const [trashLeftover, setTrashLeftover] = useState<string>("");

  // Inventory Manager EOD Report Field
  const [eodReport, setEodReport] = useState<string>("");

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

  const calculatedSalary = useMemo(() => {
    return calculateSalary(totalPlatesSold);
  }, [totalPlatesSold]);

  const isValid = useMemo(() => {
    if (isIM) {
      return true; // EOD report is optional or notes only
    }
    return (
      Number(cheese) >= 0 &&
      Number(octobits) >= 0 &&
      Number(crab) >= 0 &&
      Number(cashOnhand) >= 0 &&
      Number(expenses) >= 0 &&
      Number(gcashPayment) >= 0 &&
      Number(free) >= 0 &&
      !isNaN(Number(shortOver))
    );
  }, [isIM, cheese, octobits, crab, cashOnhand, expenses, gcashPayment, free, shortOver]);

  const handleEndShift = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeShift) {
      toast.error("No active shift found");
      return;
    }

    if (!isValid) {
      toast.error("Please complete all required fields properly");
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = isIM
        ? {
            sessionId: activeShift.sessionId,
            eodReport: eodReport.trim(),
            cheese: 0,
            octobits: 0,
            crab: 0,
            cashOnhand: 0,
            expenses: 0,
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
            trashLeftover: trashLeftover.trim(),
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

      toast.success(
        isIM
          ? "Shift ended with EOD Report."
          : "Shift ended with Sales Log."
      );
      onClose();
      onSuccess();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Error ending shift"
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto max-sm:bottom-0 max-sm:top-auto max-sm:left-0 max-sm:right-0 max-sm:translate-x-0 max-sm:translate-y-0 max-sm:max-w-full max-sm:rounded-t-2xl max-sm:rounded-b-none max-sm:max-h-[92vh] max-sm:pb-6">
        {/* Drag Handle Indicator for Bottom Sheet (Visible on mobile only) */}
        <div className="hidden max-sm:block w-12 h-1 bg-zinc-300 dark:bg-zinc-700 rounded-full mx-auto mb-3" />

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
                <div className="p-3 bg-zinc-50 dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-lg text-sm text-zinc-600 dark:text-zinc-400">
                  <span className="font-semibold text-zinc-900 dark:text-zinc-100 block mb-1">
                    Inventory Manager Shift Handover
                  </span>
                  As an Inventory Manager, you do not need to log branch sales. Please summarize your warehouse operations, shipments received, or handover notes below.
                </div>

                <div>
                  <label className="text-sm font-semibold text-zinc-800 dark:text-zinc-200 block mb-1.5">
                    End of Day (EOD) Report / Notes
                  </label>
                  <textarea
                    rows={4}
                    value={eodReport}
                    onChange={(e) => setEodReport(e.target.value)}
                    placeholder="e.g. Received 50kg tako mix from supplier, audited branch 2 stock, all central warehouse items counted."
                    className="w-full rounded-md border border-input bg-background p-3 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  />
                </div>
              </div>
            ) : (
              /* BRANCH SELLER VIEW: PLATES & SALES LOG */
              <div className="space-y-5 text-sm">
                {/* Autocomputed Summary (2-column layout) */}
                <div className="bg-zinc-50 dark:bg-zinc-900/50 p-4 rounded-xl border border-zinc-200 dark:border-zinc-800 space-y-3">
                  <h4 className="text-[11px] font-bold uppercase tracking-wider text-zinc-400 dark:text-zinc-500">
                    Autocomputed Shift Metrics
                  </h4>
                  
                  <div className="grid grid-cols-2 gap-3">
                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Total Plates Sold</span>
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {totalPlatesSold} plates
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Sales Revenue</span>
                      <span className="text-base font-bold text-emerald-600 dark:text-emerald-400">
                        {formatPeso(totalSales)}
                      </span>
                    </div>

                    <div className="bg-white dark:bg-zinc-900 p-3 rounded-lg border border-zinc-200 dark:border-zinc-800 col-span-2">
                      <span className="text-[11px] text-zinc-500 block font-semibold">Calculated Shift Salary</span>
                      <span className="text-base font-bold text-zinc-900 dark:text-zinc-100">
                        {formatPeso(calculatedSalary)}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Plates Sold (1-column layout) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">
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
                        required
                        className="font-bold text-base text-center h-11"
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
                        required
                        className="font-bold text-base text-center h-11"
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
                        required
                        className="font-bold text-base text-center h-11"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-200 dark:border-zinc-800" />

                {/* Cash & Operations (1-column layout) */}
                <div className="space-y-3">
                  <h3 className="text-sm font-bold uppercase text-zinc-700 dark:text-zinc-300 tracking-wider">
                    Operations
                  </h3>

                  <div className="grid grid-cols-1 gap-3">
                    <div className="flex gap-3">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Cash on Hand (₱)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={cashOnhand}
                        onChange={(e) => setCashOnhand(e.target.value)}
                        required
                        className="w-1/3 h-10 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex gap-3">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Expenses (₱)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={expenses}
                        onChange={(e) => setExpenses(e.target.value)}
                        className="w-1/3 h-10 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex gap-3">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        GCash Payments (₱)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={gcashPayment}
                        onChange={(e) => setGcashPayment(e.target.value)}
                        className="w-1/3 h-10 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex gap-3">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Free B-Box (pcs)
                      </label>
                      <Input
                        type="number"
                        min={0}
                        value={free}
                        onChange={(e) => setFree(e.target.value)}
                        className="w-1/3 h-10 text-sm font-semibold"
                      />
                    </div>

                    <div className="flex gap-3">
                      <label className="w-full text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Short / Over (₱)
                      </label>
                      <Input
                        type="number"
                        value={shortOver}
                        onChange={(e) => setShortOver(e.target.value)}
                        placeholder="e.g. -100 or 100"
                        className="w-1/3 h-10 text-sm font-mono font-semibold"
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium text-zinc-700 dark:text-zinc-300 block mb-1">
                        Trash / Left Over
                      </label>
                      <Input
                        type="text"
                        value={trashLeftover}
                        onChange={(e) => setTrashLeftover(e.target.value)}
                        placeholder="Notes"
                        className="h-10 text-sm"
                      />
                    </div>
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
              className="h-10 text-sm font-bold"
            >
              {isSubmitting ? "Submitting..." : "End Current Shift"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
