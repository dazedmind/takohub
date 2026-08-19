"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Eye, LogOut } from "lucide-react";
import { calculateRunningDuration } from "@/lib/business-logic";
import type { ActiveEmployeeShift } from "@/lib/types";

interface ActiveShiftCardProps {
  shift: ActiveEmployeeShift;
  onOpenSalesLog?: () => void;
  onViewSelfie?: () => void;
  isAdminView?: boolean;
}

export function ActiveShiftCard({
  shift,
  onOpenSalesLog,
  onViewSelfie,
  isAdminView = false,
}: ActiveShiftCardProps) {
  const [runningTime, setRunningTime] = useState<string>(
    shift.runningTime || "00h 00m 00s"
  );

  useEffect(() => {
    const updateTimer = () => {
      const duration = calculateRunningDuration(shift.startShift);
      setRunningTime(duration.formattedString);
    };

    updateTimer();
    const interval = setInterval(updateTimer, 1000);
    return () => clearInterval(interval);
  }, [shift.startShift]);

  const startTimeFormatted = new Date(shift.startShift).toLocaleTimeString(
    "en-PH",
    {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    }
  );

  const empInitial = (shift.userName || "U").charAt(0).toUpperCase();

  return (
    <Card className="border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 shadow-sm">
      <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
        <div>
          <span className="text-xs font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block">
            Shift Active
          </span>
          <CardTitle className="text-lg font-bold text-zinc-900 dark:text-zinc-100 mt-0.5">
            {shift.branchName}
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="font-bold text-xs px-2.5 py-0.5 border-emerald-500 text-emerald-600 bg-emerald-50 dark:bg-emerald-950/20"
        >
          ACTIVE
        </Badge>
      </CardHeader>

      <CardContent className="space-y-4">
        {isAdminView && (
          <div className="flex items-center gap-2.5 text-sm">
            <div className="w-7 h-7 rounded-full bg-[#F4D671] text-[#1C1C1C] font-bold text-xs flex items-center justify-center shrink-0 border border-[#ebd060]">
              {empInitial}
            </div>
            <div>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">{shift.userName}</span>
              <span className="text-zinc-400 mx-1.5">•</span>
              <span className="text-zinc-500 text-xs font-medium">{shift.role}</span>
            </div>
          </div>
        )}

        <div className="grid grid-cols-2 gap-3 text-sm bg-zinc-50 dark:bg-zinc-950 p-3 rounded-lg border border-zinc-100 dark:border-zinc-800">
          <div>
            <span className="text-xs text-zinc-500 block">Started</span>
            <span className="font-semibold text-zinc-900 dark:text-zinc-100 text-sm">{startTimeFormatted}</span>
          </div>
          <div>
            <span className="text-xs text-zinc-500 block">Running Time</span>
            <span className="font-mono font-bold text-zinc-900 dark:text-zinc-100 text-sm">{runningTime}</span>
          </div>
        </div>

        {/* Action buttons */}
        <div className="flex gap-2 pt-1">
          {/* {onViewSelfie && (
            <Button
              type="button"
              variant="tertiary"
              size="sm"
              onClick={onViewSelfie}
              className="text-sm font-semibold flex-1 h-9 gap-1.5"
            >
              <Eye size={15} />
              <span>Selfie Proof</span>
            </Button>
          )} */}

          {!isAdminView && onOpenSalesLog && (
            <Button
              type="button"
              variant="danger"
              size="sm"
              onClick={onOpenSalesLog}
              className="text-sm font-bold flex-1 h-9 gap-1.5"
            >
              <LogOut size={15} />
              <span>End Shift</span>
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
