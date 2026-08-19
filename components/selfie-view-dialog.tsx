"use client";

import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { ActiveEmployeeShift } from "@/lib/types";

interface SelfieViewDialogProps {
  isOpen: boolean;
  onClose: () => void;
  shift: ActiveEmployeeShift | null;
}

export function SelfieViewDialog({
  isOpen,
  onClose,
  shift,
}: SelfieViewDialogProps) {
  if (!shift) return null;

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-sm">
        <DialogHeader>
          <DialogTitle>Attendance Selfie</DialogTitle>
        </DialogHeader>

        <div className="space-y-3">
          <div className="rounded-md overflow-hidden border border-zinc-200 dark:border-zinc-800 bg-black aspect-4/3 flex items-center justify-center">
            {shift.selfieUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={shift.selfieUrl}
                alt={`Attendance selfie for ${shift.userName}`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="text-zinc-500 text-xs">No image available</div>
            )}
          </div>

          <div className="space-y-1.5 text-xs text-zinc-600 dark:text-zinc-400">
            <div className="flex justify-between">
              <span>Employee:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{shift.userName}</span>
            </div>
            <div className="flex justify-between">
              <span>Role:</span>
              <span className="font-medium text-zinc-800 dark:text-zinc-200">{shift.role}</span>
            </div>
            <div className="flex justify-between">
              <span>Branch:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{shift.branchName}</span>
            </div>
            <div className="flex justify-between">
              <span>Started:</span>
              <span>{new Date(shift.startShift).toLocaleString("en-PH")}</span>
            </div>
            <div className="flex justify-between pt-1 border-t border-zinc-100 dark:border-zinc-800">
              <span>Status:</span>
              <Badge variant="outline" className="text-[10px]">
                {shift.shiftStatus}
              </Badge>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            type="button"
            variant="tertiary"
            size="sm"
            onClick={onClose}
            className="w-full h-8"
          >
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
