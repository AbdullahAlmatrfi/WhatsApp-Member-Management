"use client";

import { Check } from "lucide-react";

interface ToastProps {
  show: boolean;
  message: string;
}

export function Toast({ show, message }: ToastProps) {
  return (
    <div
      className={`fixed right-4 top-4 z-50 flex items-center gap-3 rounded-xl bg-primary px-4 py-3 text-primary-foreground shadow-lg transition-all duration-300 ${
        show
          ? "translate-x-0 opacity-100"
          : "translate-x-full opacity-0 pointer-events-none"
      }`}
    >
      <div className="flex h-6 w-6 items-center justify-center rounded-full bg-primary-foreground/20">
        <Check className="h-4 w-4" />
      </div>
      <span className="font-medium">{message}</span>
    </div>
  );
}
