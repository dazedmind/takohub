"use client";

import React, { createContext, useContext, useState, useCallback } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, AlertTriangle, Info } from "lucide-react";
import { BiSolidCheckCircle, BiSolidError, BiSolidErrorCircle } from "react-icons/bi";

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

  const getIcon = () => {
    switch (options.type) {
      case "success":
        return <BiSolidCheckCircle className="w-14 h-14 text-emerald-500 mb-4" />;
      case "error":
        return <BiSolidError className="w-14 h-14 text-red-500 mb-4" />;
      case "warning":
        return <BiSolidError className="w-14 h-14 text-amber-500 mb-4" />;
      case "info":
      default:
        return <BiSolidErrorCircle className="w-14 h-14 text-blue-500 mb-4" />;
    }
  };

  const hide = useCallback(() => {
    setIsOpen(false);
  }, []);

  return (
    <DialogContext.Provider value={{ show, hide }}>
      {children}
      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="max-w-xs py-12 border border-zinc-200 dark:border-zinc-800 bg-white dark:bg-zinc-950 p-4 shadow-xl rounded-xl animate-in zoom-in-95 fade-in duration-200">
          {/* <DialogHeader className="text-center flex flex-col items-center justify-center">
            <DialogTitle className={`text-2xl font-bold text-center w-full ${
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
          </DialogHeader> */}
          <div className="flex flex-col items-center justify-center text-center -space-y-1">
            {getIcon()}
            <h2 className="font-semibold text-2xl">{options.title}</h2>
            <p className="py-2 text-base leading-tight text-center text-zinc-600 dark:text-zinc-400">{options.message}</p>
          </div>
            <Button
              type="button"
              variant={options.type === "success" ? "primary" : "secondary"}
              onClick={() => {
                setIsOpen(false);
                if (options.onConfirm) {
                  options.onConfirm();
                }
              }}
              className="h-10 text-sm font-bold mx-auto"
            >
              {options.confirmText}
            </Button>
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
