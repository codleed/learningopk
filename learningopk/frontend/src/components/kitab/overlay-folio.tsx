"use client";

import { useEffect } from "react";
import { createPortal } from "react-dom";

/* ═══════════════════════════════════════════════════════════════
   OverlayFolio — modal layer on paper. The page dims slightly
   and the folio appears as if placed on top. Escape closes.
   ═══════════════════════════════════════════════════════════════ */

export function OverlayFolio({
  open,
  onClose,
  title,
  children,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: React.ReactNode;
}) {
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  if (!open || typeof document === "undefined") return null;

  return createPortal(
    <div className="fixed inset-0 z-50" role="dialog" aria-modal="true" aria-label={title}>
      <button
        type="button"
        aria-label="Close"
        onClick={onClose}
        className="absolute inset-0 bg-black/55"
      />
      <div className="absolute inset-x-0 top-[8vh] mx-auto w-[min(92vw,560px)] rounded-folio border border-hairline-strong bg-paper-dim p-6 shadow-[var(--shadow-md)]">
        <h2 className="overline mb-4 text-ink-soft">{title}</h2>
        {children}
      </div>
    </div>,
    document.body
  );
}
