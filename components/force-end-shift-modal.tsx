"use client";

import { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useGlobalDialog } from "@/components/providers/dialog-provider";
import { AlertTriangle, Clock, LogOut, Store, User } from "lucide-react";
import type { ActiveEmployeeShift } from "@/lib/types";

interface ForceEndShiftModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (endedSessionId?: number) => void;
  shift: ActiveEmployeeShift | null;
}

export function ForceEndShiftModal({
  isOpen,
  onClose,
  onSuccess,
  shift,
}: ForceEndShiftModalProps) {
  const dialog = useGlobalDialog();
  const [reason, setReason] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!shift) return null;

  const startTimeFormatted = new Date(shift.startShift).toLocaleTimeString("en-PH", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });

  const handleForceEnd = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      const response = await fetch("/api/attendance/force-end", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          sessionId: shift.sessionId,
          reason: reason.trim() || undefined,
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Failed to force end shift");
      }

      const endedSessionId = shift.sessionId;
      // Close modal and trigger instant UI update immediately
      onClose();
      onSuccess(endedSessionId);

      dialog.show({
        title: "Shift Terminated",
        message: `Shift for ${shift.userName} (${shift.branchName}) has been forcefully ended.`,
        type: "success",
      });
    } catch (error) {
      dialog.show({
        title: "Action Failed",
        message: error instanceof Error ? error.message : "Error force ending shift",
        type: "error",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && !isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleForceEnd}>
          <DialogHeader className="pb-2">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-full bg-red-100 dark:bg-red-950/40 text-red-600 dark:text-red-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100">
                  Force End Shift
                </DialogTitle>
                <p className="text-xs text-zinc-500">
                  Terminate active shift session as Administrator
                </p>
              </div>
            </div>
          </DialogHeader>

          <div className="space-y-4 py-3">
            {/* Shift Context Card */}
            <div className="bg-zinc-50 dark:bg-zinc-900/80 rounded-lg p-3.5 border border-zinc-200/80 dark:border-zinc-800 space-y-2 text-xs">
              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                  <User size={13} /> Employee
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {shift.userName}{" "}
                  <span className="text-[10px] text-zinc-500 font-normal">({shift.role})</span>
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                  <Store size={13} /> Branch
                </span>
                <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                  {shift.branchName}
                </span>
              </div>

              <div className="flex items-center justify-between">
                <span className="text-zinc-500 flex items-center gap-1.5 font-medium">
                  <Clock size={13} /> Started At
                </span>
                <span className="font-mono text-zinc-700 dark:text-zinc-300">
                  {startTimeFormatted}
                </span>
              </div>

              {shift.runningTime && (
                <div className="flex items-center justify-between pt-1 border-t border-zinc-200/60 dark:border-zinc-800">
                  <span className="text-zinc-500 font-medium">Running Duration</span>
                  <span className="font-mono font-bold text-emerald-600 dark:text-emerald-400">
                    {shift.runningTime}
                  </span>
                </div>
              )}
            </div>

            {/* Reason input */}
            <div className="space-y-1.5">
              <label
                htmlFor="force-end-reason"
                className="text-xs font-semibold text-zinc-700 dark:text-zinc-300 block"
              >
                Reason / Remarks (Optional)
              </label>
              <Input
                id="force-end-reason"
                type="text"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                placeholder="e.g. Employee forgot to clock out, kiosk closed early"
                className="h-9 text-xs"
                disabled={isSubmitting}
              />
              <p className="text-[11px] text-zinc-400">
                This remark will be recorded in attendance history and sales remarks.
              </p>
            </div>

            {/* Warning callout */}
            <div className="bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900/50 rounded-md p-2.5 text-xs text-amber-800 dark:text-amber-300">
              <span className="font-semibold">Notice:</span> This action immediately concludes the
              shift session. If no sales were logged yet, empty sales will be recorded with this note.
            </div>
          </div>

          <DialogFooter className="gap-2 sm:gap-2">
            <Button
              type="button"
              variant="tertiary"
              onClick={onClose}
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              variant="danger"
              disabled={isSubmitting}
              className="h-9 px-4 text-xs font-semibold gap-1.5"
            >
              <LogOut size={13} />
              <span>{isSubmitting ? "Ending Shift..." : "Force End Shift"}</span>
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
