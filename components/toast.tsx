"use client";

import { Check, AlertTriangle } from "lucide-react";

export type ToastVariant = "success" | "error";

interface ToastProps {
  show: boolean;
  message: string;
  variant?: ToastVariant;
}

export function Toast({ show, message, variant = "success" }: ToastProps) {
  const isError = variant === "error";
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ${
        isError ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
      } ${
        show
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div
        className={`flex h-6 w-6 items-center justify-center rounded-full ${
          isError ? "bg-destructive-foreground/20" : "bg-primary-foreground/20"
        }`}
      >
        {isError ? <AlertTriangle className="h-4 w-4" /> : <Check className="h-4 w-4" />}
      </div>
      <span className="font-medium">{message}</span>
    </div>
  );
}
