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
    <>
      {/*
        Live regions are ALWAYS mounted (a region that appears together with its
        text is often not announced). Success -> polite status; failure -> alert.
        The text is cleared when the toast hides so an identical message announces
        again next time. Explicit aria-live also keeps them out of the
        aria-hidden that Radix applies to the page behind an open dialog.
      */}
      <div role="status" aria-live="polite" aria-atomic="true" className="sr-only">
        {show && !isError ? message : ""}
      </div>
      <div role="alert" aria-live="assertive" aria-atomic="true" className="sr-only">
        {show && isError ? message : ""}
      </div>

      {/* Visual toast only; announced via the regions above, so hidden from AT. */}
      <div
        aria-hidden="true"
        className={`fixed end-4 top-4 z-[100] pointer-events-none flex items-center gap-3 rounded-xl px-4 py-3 shadow-lg transition-all duration-300 ${
          isError ? "bg-destructive text-destructive-foreground" : "bg-primary text-primary-foreground"
        } ${
          show
            ? "translate-x-0 opacity-100"
            : "opacity-0 ltr:translate-x-full rtl:-translate-x-full"
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
    </>
  );
}
