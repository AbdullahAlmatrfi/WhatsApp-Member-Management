"use client";

import { useEffect, useRef } from "react";
import { AlertTriangle } from "lucide-react";
// Cancel/Action come straight from Radix so the existing button look is kept
// exactly (the shadcn wrappers would add their own button styles on top).
import * as AlertDialogPrimitive from "@radix-ui/react-alert-dialog";
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useApp } from "@/lib/translations";
import { useReturnFocus } from "@/hooks/use-return-focus";

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
  const returnFocus = useReturnFocus(isOpen);

  // The parent clears the name as soon as the dialog closes; keep the last one
  // so the text doesn't blank out during the fade-out.
  const lastNameRef = useRef(memberName);
  useEffect(() => {
    if (memberName) lastNameRef.current = memberName;
  }, [memberName]);
  const displayName = memberName || lastNameRef.current;

  return (
    // Escape (and any dismissal) = Cancel: nothing is deleted.
    <AlertDialog
      open={isOpen}
      onOpenChange={(open) => {
        if (!open) onCancel();
      }}
    >
      <AlertDialogContent
        aria-modal="true"
        overlayClassName="bg-background/80 backdrop-blur-sm"
        onCloseAutoFocus={returnFocus}
        className="gap-0 rounded-2xl border-border bg-card p-6 shadow-2xl sm:max-w-sm"
      >
        <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-destructive/20">
          <AlertTriangle className="h-6 w-6 text-destructive" />
        </div>

        <AlertDialogTitle className="mb-2 text-foreground">{t.deleteConfirm}</AlertDialogTitle>
        <AlertDialogDescription className="mb-6">
          <span className="font-medium text-foreground">{displayName}</span>
          {" - "}
          {t.undone}
        </AlertDialogDescription>

        <div className="flex gap-3">
          <AlertDialogPrimitive.Cancel className="flex-1 rounded-xl bg-secondary px-4 py-3 font-medium text-secondary-foreground transition-all duration-200 hover:bg-muted">
            {t.cancel}
          </AlertDialogPrimitive.Cancel>
          <AlertDialogPrimitive.Action
            onClick={onConfirm}
            className="flex-1 rounded-xl bg-destructive px-4 py-3 font-medium text-destructive-foreground transition-all duration-200 hover:brightness-110"
          >
            {t.delete}
          </AlertDialogPrimitive.Action>
        </div>
      </AlertDialogContent>
    </AlertDialog>
  );
}
