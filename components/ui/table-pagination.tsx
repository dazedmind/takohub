"use client";

import React, { useMemo, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

export interface TablePaginationProps {
  currentPage: number;
  pageSize: number;
  totalItems: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (pageSize: number) => void;
  pageSizeOptions?: number[];
  className?: string;
}

export function TablePagination({
  currentPage,
  pageSize,
  totalItems,
  onPageChange,
  onPageSizeChange,
  pageSizeOptions = [10, 15, 50, 100],
  className = "",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  const startRecord = totalItems === 0 ? 0 : (currentPage - 1) * pageSize + 1;
  const endRecord = Math.min(currentPage * pageSize, totalItems);

  const canGoPrevious = currentPage > 1;
  const canGoNext = currentPage < totalPages;

  return (
    <div
      className={`flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-900 text-xs text-zinc-600 dark:text-zinc-400 ${className}`}
    >
      {/* Records info */}
      <div className="flex items-center gap-2 text-center sm:text-left">
        <span>
          Showing{" "}
          <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
            {startRecord}
          </strong>{" "}
          to{" "}
          <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
            {endRecord}
          </strong>{" "}
          of{" "}
          <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
            {totalItems}
          </strong>{" "}
          records
        </span>
      </div>

      {/* Page size selector & Page navigation controls */}
      <div className="flex flex-wrap items-center justify-center gap-4">
        {/* Page size selector */}
        <div className="flex items-center gap-1.5">
          <span className="text-zinc-500 whitespace-nowrap">Rows per page:</span>
          <select
            value={pageSize}
            onChange={(e) => {
              const newSize = Number(e.target.value);
              onPageSizeChange(newSize);
            }}
            className="h-8 px-2 rounded-md border border-zinc-300 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-zinc-900 dark:text-zinc-100 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500 cursor-pointer font-medium"
          >
            {pageSizeOptions.map((opt) => (
              <option key={opt} value={opt}>
                {opt}
              </option>
            ))}
          </select>
        </div>

        {/* Page numbers & Navigation buttons */}
        <div className="flex items-center gap-1">
          <span className="text-zinc-500 mr-2 whitespace-nowrap">
            Page{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {currentPage}
            </strong>{" "}
            of{" "}
            <strong className="font-semibold text-zinc-900 dark:text-zinc-100">
              {totalPages}
            </strong>
          </span>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onPageChange(1)}
            disabled={!canGoPrevious}
            className="h-7 w-7 p-0 disabled:opacity-30"
            title="First Page"
          >
            <ChevronsLeft size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={!canGoPrevious}
            className="h-7 w-7 p-0 disabled:opacity-30"
            title="Previous Page"
          >
            <ChevronLeft size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={!canGoNext}
            className="h-7 w-7 p-0 disabled:opacity-30"
            title="Next Page"
          >
            <ChevronRight size={14} />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="icon-xs"
            onClick={() => onPageChange(totalPages)}
            disabled={!canGoNext}
            className="h-7 w-7 p-0 disabled:opacity-30"
            title="Last Page"
          >
            <ChevronsRight size={14} />
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Convenience hook to manage pagination state for a list of items
 */
export function usePagination<T>(items: T[], defaultPageSize: number = 10) {
  const [currentPage, setCurrentPage] = useState<number>(1);
  const [pageSize, setPageSize] = useState<number>(defaultPageSize);

  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));

  // Reset to last valid page if current page exceeds total pages
  useEffect(() => {
    if (currentPage > totalPages) {
      setCurrentPage(totalPages);
    }
  }, [totalPages, currentPage]);

  const handlePageSizeChange = (newSize: number) => {
    setPageSize(newSize);
    setCurrentPage(1);
  };

  const paginatedItems = useMemo(() => {
    const startIndex = (currentPage - 1) * pageSize;
    return items.slice(startIndex, startIndex + pageSize);
  }, [items, currentPage, pageSize]);

  return {
    currentPage,
    setCurrentPage,
    pageSize,
    setPageSize: handlePageSizeChange,
    totalPages,
    totalItems: items.length,
    paginatedItems,
  };
}
