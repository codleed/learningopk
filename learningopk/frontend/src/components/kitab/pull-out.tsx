"use client";

import { useEffect, useState, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   PullOut — mobile-only drawer that slides from the LEFT on a
   vertical drag gesture (the "pull a page out of a binder").
   Desktop: renders nothing. Mobile: gesture + chevron affordance.
   ═══════════════════════════════════════════════════════════════ */

export function PullOut({
  children,
  label = "Open index",
  className,
}: {
  children: ReactNode;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [touchStartX, setTouchStartX] = useState<number | null>(null);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);

  /* Esc closes; content focus handled by the index itself. */
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  /* Only mount when a vertical drag from the left edge exceeds threshold. */
  const onTouchStart = (e: React.TouchEvent) => {
    setTouchStartX(e.touches[0].clientX);
    setTouchStartY(e.touches[0].clientY);
  };

  const onTouchEnd = (e: React.TouchEvent) => {
    if (touchStartX === null || touchStartY === null) return;
    const dx = e.changedTouches[0].clientX - touchStartX;
    const dy = e.changedTouches[0].clientY - touchStartY;
    const isPull = dx > 56 && Math.abs(dy) < 40 && touchStartX < 40;
    if (isPull) setOpen(true);
    setTouchStartX(null);
    setTouchStartY(null);
  };

  return (
    <>
      <div
        className={cn("lg:hidden", className)}
        onTouchStart={onTouchStart}
        onTouchEnd={onTouchEnd}
      >
        {/* The bookmark-tab affordance: always visible, top-left. */}
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={label}
          className="fixed left-0 top-24 z-40 flex h-10 w-6 items-center justify-center rounded-r-folio bg-accent text-on-accent"
        >
          <svg width="10" height="10" viewBox="0 0 10 10" aria-hidden="true">
            <path d="M6 1 L2 5 L6 9" fill="none" stroke="currentColor" strokeWidth="1.5" />
          </svg>
        </button>

        {open ? (
          <div className="fixed inset-0 z-50 lg:hidden">
            <button
              type="button"
              aria-label="Close index"
              onClick={() => setOpen(false)}
              className="absolute inset-0 bg-black/55"
            />
            <div
              className="absolute inset-y-0 left-0 w-[min(85vw,320px)] overflow-y-auto rounded-r-[12px] border border-hairline bg-paper-raised p-6 shadow-[var(--shadow-md)]"
              style={{ animation: "var(--overlay) var(--ease-kitab) slide-in-left" }}
            >
              {children}
            </div>
          </div>
        ) : null}
      </div>
    </>
  );
}
