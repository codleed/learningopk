"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";

import { cn } from "@/lib/utils";

/* ─── Slide direction config ─── */
type SheetSide = "left" | "right" | "bottom";

const slideVariants: Record<SheetSide, { initial: Record<string, number | string>; animate: Record<string, number | string>; exit: Record<string, number | string> }> = {
  left: {
    initial: { x: "-100%" },
    animate: { x: 0 },
    exit: { x: "-100%" },
  },
  right: {
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
  },
  bottom: {
    initial: { y: "100%" },
    animate: { y: 0 },
    exit: { y: "100%" },
  },
};

const sidePositionClasses: Record<SheetSide, string> = {
  left: "inset-y-0 left-0 w-80 max-w-[85vw] border-r border-border-default",
  right: "inset-y-0 right-0 w-80 max-w-[85vw] border-l border-border-default",
  bottom: "inset-x-0 bottom-0 h-auto max-h-[85vh] border-t border-border-default rounded-t-xl",
};

/** Props for the Sheet component. */
export interface SheetProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the open state should change. */
  onOpenChange: (open: boolean) => void;
  /** Side from which the sheet slides in. */
  side?: SheetSide;
  /** Sheet content. */
  children: ReactNode;
  /** Additional class applied to the sheet panel. */
  className?: string;
  /** Whether to show the close (X) button. Defaults to true. */
  showClose?: boolean;
}

/**
 * Slide-in panel built on Radix UI Dialog with Framer Motion animations.
 *
 * Slides from left, right, or bottom.
 */
export function Sheet({
  open,
  onOpenChange,
  side = "right",
  children,
  className,
  showClose = true,
}: SheetProps) {
  const motionVariant = slideVariants[side];

  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            {/* Overlay */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>

            {/* Content */}
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn(
                  "fixed z-50 flex flex-col bg-bg-surface shadow-[var(--shadow-elevated)]",
                  sidePositionClasses[side],
                  className
                )}
                initial={motionVariant.initial}
                animate={motionVariant.animate}
                exit={motionVariant.exit}
                transition={{ type: "spring" as const, damping: 30, stiffness: 300 }}
              >
                {showClose ? (
                  <DialogPrimitive.Close
                    className={cn(
                      "absolute right-4 top-4 z-10 rounded-md p-1",
                      "text-text-muted hover:text-text-primary hover:bg-bg-subtle",
                      "transition-colors duration-150",
                      "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                    )}
                    aria-label="Close sheet"
                  >
                    <X className="h-4 w-4" />
                  </DialogPrimitive.Close>
                ) : null}

                {children}
              </motion.div>
            </DialogPrimitive.Content>
          </DialogPrimitive.Portal>
        ) : null}
      </AnimatePresence>
    </DialogPrimitive.Root>
  );
}

/* ═══════════════════════════════════════════
   Sub-components
   ═══════════════════════════════════════════ */

/** Props for SheetHeader. */
export type SheetHeaderProps = HTMLAttributes<HTMLDivElement>;

/** Header area for the sheet panel. */
export function SheetHeader({ className, ...props }: SheetHeaderProps) {
  return (
    <div
      className={cn("px-5 pt-5 pb-3", className)}
      {...props}
    />
  );
}

/** Props for SheetBody. */
export type SheetBodyProps = HTMLAttributes<HTMLDivElement>;

/** Scrollable body area. */
export function SheetBody({ className, ...props }: SheetBodyProps) {
  return (
    <div
      className={cn("flex-1 overflow-y-auto px-5 py-4", className)}
      {...props}
    />
  );
}

/** Props for SheetFooter. */
export type SheetFooterProps = HTMLAttributes<HTMLDivElement>;

/** Footer area with flex layout for actions. */
export function SheetFooter({ className, ...props }: SheetFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border-default px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

/** Props for SheetTitle. */
export type SheetTitleProps = HTMLAttributes<HTMLHeadingElement>;

/** Accessible sheet title. */
export function SheetTitle({ className, ...props }: SheetTitleProps) {
  return (
    <DialogPrimitive.Title
      className={cn(
        "text-lg font-semibold text-text-primary font-[var(--font-display)]",
        className
      )}
      {...props}
    />
  );
}

/** Props for SheetDescription. */
export type SheetDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** Accessible sheet description. */
export function SheetDescription({ className, ...props }: SheetDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

/* ─── Re-exports ─── */
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
