"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

interface DialogOptions {
  title: string;
  message: string;
  type?: "success" | "error" | "warning" | "info";
  confirmText?: string;
  onConfirm?: () => void;
}

interface DialogContextType {
  show: (options: DialogOptions) => void;
  hide: () => void;
}

const DialogContext = createContext<DialogContextType | null>(null);

export function DialogProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  const [options, setOptions] = useState<DialogOptions>({
    title: "",
    message: "",
    type: "info",
    confirmText: "OK",
  });

  const show = useCallback((opts: DialogOptions) => {
    setOptions({
      type: "info",
      confirmText: "OK",
      ...opts,
    });
    setIsOpen(true);
  }, []);

  const hide = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <DialogContext.Provider value={{ show, hide }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xl rounded-xl animate-in zoom-in-95 fade-in duration-200">
          <DialogHeader className="text-center flex flex-col items-center justify-center">
            <DialogTitle className={`text-lg font-bold text-center w-full ${
              options.type === "success"
                ? "text-emerald-600 dark:text-emerald-400"
                : options.type === "error"
                ? "text-red-600 dark:text-red-400"
                : options.type === "warning"
                ? "text-amber-600 dark:text-amber-400"
                : "text-zinc-900 dark:text-zinc-100"
            }`}>
              {options.title}
            </DialogTitle>
          </DialogHeader>
          <div className="py-2 text-sm text-center text-zinc-600 dark:text-zinc-400">
            {options.message}
          </div>
          <DialogFooter className="sm:justify-center flex justify-center w-full">
            <Button
              type="button"
              variant={options.type === "success" ? "primary" : "secondary"}
              onClick={() => {
                setIsOpen(false);
                if (options.onConfirm) {
                  options.onConfirm();
                }
              }}
              className="h-10 text-sm font-bold min-w-[100px] mx-auto"
            >
              {options.confirmText}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </DialogContext.Provider>
  );
}

export function useGlobalDialog() {
  const context = useContext(DialogContext);
  if (!context) {
    throw new Error("useGlobalDialog must be used within a DialogProvider");
  }
  return context;
}
