"use client";

import { AlertTriangle } from "lucide-react";
import { useApp } from "@/lib/translations";

interface DeleteDialogProps {
  isOpen: boolean;
  memberName: string;
  onConfirm: () => void;
  onCancel: () => void;
}

export function DeleteDialog({
  isOpen,
  memberName,
  onConfirm,
  onCancel,
}: DeleteDialogProps) {
  const { t } = useApp();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-background/80 backdrop-blur-sm transition-opacity duration-200"
        onClick={onCancel}
      />

      <div
        className={`relative w-full max-w-sm rounded-2xl border border-border bg-card p-6 shadow-2xl transition-all duration-200 ${
          isOpen ? "scale-100 opacity-100" : "scale-95 opacity-0"
        }`}
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <h3 className="mb-2 text-lg font-semibold text-foreground">
          {t.deleteConfirm}
        </h3>
        <p className="mb-6 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{memberName}</span>
          {" - "}
          {t.undone}
        </p>

        <div className="flex gap-3">
          <button
            onClick={onCancel}
            className="flex-1 rounded-xl bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-all duration-200 hover:bg-muted"
          >
            {t.cancel}
          </button>
          <button
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-destructive px-4 py-3 font-medium text-destructive-foreground transition-all duration-200 hover:brightness-110"
          >
            {t.delete}
          </button>
        </div>
      </div>
    </div>
  );
}
