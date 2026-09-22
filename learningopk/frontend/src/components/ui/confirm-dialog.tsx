"use client";

import { useEffect } from "react";

import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  open: boolean;
  title: string;
  description?: string;
  confirmLabel?: string;
  cancelLabel?: string;
  danger?: boolean;
  isPending?: boolean;
  onConfirm: () => void;
  onCancel: () => void;
};

export function ConfirmDialog({
  open,
  title,
  description,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  danger = false,
  isPending = false,
  onConfirm,
  onCancel,
}: ConfirmDialogProps) {
  useEffect(() => {
    if (!open) {
      return;
    }

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        onCancel();
      }
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onCancel, open]);

  if (!open) {
    return null;
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-4"
      role="presentation"
    >
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        className="w-full max-w-md rounded-[12px] border border-hairline-strong bg-paper-dim p-6 shadow-[var(--shadow-md)]"
      >
        <h2 id="confirm-dialog-title" className="text-lg font-semibold text-ink">
          {title}
        </h2>
        {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
        <div className="mt-6 flex flex-wrap justify-end gap-2">
          <Button variant="secondary" onClick={onCancel} disabled={isPending}>
            {cancelLabel}
          </Button>
          <Button variant={danger ? "danger" : "primary"} onClick={onConfirm} disabled={isPending}>
            {isPending ? "Please wait..." : confirmLabel}
          </Button>
        </div>
      </div>
    </div>
  );
}
