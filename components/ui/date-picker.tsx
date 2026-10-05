"use client";

import * as React from "react";
import { Calendar as CalendarIcon, ChevronLeft, ChevronRight, X } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface DatePickerProps {
  value?: string; // YYYY-MM-DD
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

const MONTH_NAMES = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

const DAY_NAMES = ["Su", "Mo", "Tu", "We", "Th", "Fr", "Sa"];

export function DatePicker({
  value,
  onChange,
  placeholder = "Pick a date",
  className,
  disabled = false,
}: DatePickerProps) {
  const [open, setOpen] = React.useState(false);

  // Parse current selected date
  const parsedDate = React.useMemo(() => {
    if (!value) return null;
    const [y, m, d] = value.split("-").map(Number);
    if (!y || !m || !d) return null;
    return new Date(y, m - 1, d);
  }, [value]);

  // Current view state in calendar (year & month)
  const [viewDate, setViewDate] = React.useState<Date>(() => {
    return parsedDate || new Date();
  });

  // Keep viewDate in sync when value changes externally
  React.useEffect(() => {
    if (parsedDate) {
      setViewDate(parsedDate);
    }
  }, [parsedDate]);

  const viewYear = viewDate.getFullYear();
  const viewMonth = viewDate.getMonth();

  const handlePrevMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth - 1, 1));
  };

  const handleNextMonth = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setViewDate(new Date(viewYear, viewMonth + 1, 1));
  };

  // Generate grid days
  const calendarDays = React.useMemo(() => {
    const firstDayIndex = new Date(viewYear, viewMonth, 1).getDay();
    const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();

    const days: Array<{ day: number; dateStr: string; isCurrentMonth: boolean }> = [];

    // Empty offset days before month starts
    for (let i = 0; i < firstDayIndex; i++) {
      days.push({ day: 0, dateStr: "", isCurrentMonth: false });
    }

    // Actual days of month
    for (let d = 1; d <= daysInMonth; d++) {
      const padM = String(viewMonth + 1).padStart(2, "0");
      const padD = String(d).padStart(2, "0");
      days.push({
        day: d,
        dateStr: `${viewYear}-${padM}-${padD}`,
        isCurrentMonth: true,
      });
    }

    return days;
  }, [viewYear, viewMonth]);

  const todayStr = React.useMemo(() => {
    const today = new Date();
    const padM = String(today.getMonth() + 1).padStart(2, "0");
    const padD = String(today.getDate()).padStart(2, "0");
    return `${today.getFullYear()}-${padM}-${padD}`;
  }, []);

  const handleSelectDay = (dateStr: string) => {
    onChange(dateStr);
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange("");
  };

  const handleSelectToday = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onChange(todayStr);
    setViewDate(new Date());
    setOpen(false);
  };

  const formattedDisplay = React.useMemo(() => {
    if (!parsedDate) return null;
    return parsedDate.toLocaleDateString("en-PH", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  }, [parsedDate]);

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1.5 text-xs text-left transition-colors",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-1",
            "hover:bg-zinc-50 dark:hover:bg-zinc-800/60 disabled:cursor-not-allowed disabled:opacity-50",
            !value && "text-zinc-500 dark:text-zinc-400",
            className
          )}
        >
          <div className="flex items-center gap-2 overflow-hidden truncate">
            <CalendarIcon className="h-3.5 w-3.5 shrink-0 text-zinc-500" />
            <span className={cn("truncate", !formattedDisplay && "font-normal")}>
              {formattedDisplay || placeholder}
            </span>
          </div>

          {value && !disabled ? (
            <span
              role="button"
              tabIndex={0}
              onClick={handleClear}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  handleClear(e as any);
                }
              }}
              className="p-0.5 rounded-full hover:bg-zinc-200 dark:hover:bg-zinc-700 text-zinc-400 hover:text-zinc-600 transition-colors shrink-0 ml-1"
              title="Clear date"
            >
              <X className="h-3 w-3" />
            </span>
          ) : null}
        </button>
      </PopoverTrigger>

      <PopoverContent className="w-64 p-3 bg-white dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-800 shadow-xl rounded-xl" align="start">
        {/* Month Navigation */}
        <div className="flex items-center justify-between pb-2 border-b border-zinc-100 dark:border-zinc-800/80 mb-2">
          <span className="text-xs font-semibold text-zinc-900 dark:text-zinc-100">
            {MONTH_NAMES[viewMonth]} {viewYear}
          </span>
          <div className="flex items-center gap-1">
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handlePrevMonth}
              className="h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              aria-label="Previous month"
            >
              <ChevronLeft className="h-3.5 w-3.5" />
            </Button>
            <Button
              type="button"
              variant="ghost"
              size="icon-xs"
              onClick={handleNextMonth}
              className="h-6 w-6 p-0 hover:bg-zinc-100 dark:hover:bg-zinc-800 text-zinc-600 dark:text-zinc-300"
              aria-label="Next month"
            >
              <ChevronRight className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 gap-1 text-center mb-1">
          {DAY_NAMES.map((dn) => (
            <span key={dn} className="text-[10px] font-semibold text-zinc-400">
              {dn}
            </span>
          ))}
        </div>

        {/* Days grid */}
        <div className="grid grid-cols-7 gap-1">
          {calendarDays.map((item, idx) => {
            if (!item.isCurrentMonth) {
              return <div key={`empty-${idx}`} className="h-7 w-7" />;
            }

            const isSelected = value === item.dateStr;
            const isToday = todayStr === item.dateStr;

            return (
              <button
                key={item.dateStr}
                type="button"
                onClick={() => handleSelectDay(item.dateStr)}
                className={cn(
                  "h-7 w-7 text-xs rounded-md flex items-center justify-center font-medium transition-colors select-none",
                  isSelected
                    ? "bg-[#F4D671] text-[#1c1c1c] font-semibold "
                    : isToday
                    ? "border border-[#F4D671] text-zinc-900 dark:text-zinc-100 font-semibold hover:bg-yellow-50 dark:hover:bg-yellow-950/30"
                    : "text-zinc-700 dark:text-zinc-300 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                )}
              >
                {item.day}
              </button>
            );
          })}
        </div>

        {/* Quick actions footer */}
        <div className="flex items-center justify-between pt-2 mt-2 border-t border-zinc-100 dark:border-zinc-800/80 text-[11px]">
          <button
            type="button"
            onClick={handleSelectToday}
            className="text-xs font-semibold text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100 hover:underline"
          >
            Today
          </button>
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              className="text-xs text-red-600 hover:text-red-700 font-medium hover:underline"
            >
              Clear
            </button>
          ) : null}
        </div>
      </PopoverContent>
    </Popover>
  );
}
