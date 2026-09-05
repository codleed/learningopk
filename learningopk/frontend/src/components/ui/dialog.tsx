"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { Dialog as DialogPrimitive } from "radix-ui";
import { AnimatePresence, motion } from "framer-motion";
import { X } from "lucide-react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Size variants ─── */
const dialogSizeVariants = cva(
  [
    "relative rounded-xl bg-bg-surface text-text-primary",
    "border border-border-default shadow-[var(--shadow-elevated)]",
    "flex flex-col",
    "focus:outline-none",
  ].join(" "),
  {
    variants: {
      size: {
        sm: "w-full max-w-sm",
        md: "w-full max-w-lg",
        lg: "w-full max-w-2xl",
        fullscreen: "w-screen h-screen max-w-none rounded-none border-none",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

/* ═══════════════════════════════════════════
   Dialog Root
   ═══════════════════════════════════════════ */

/** Props for the Dialog component. */
export interface DialogProps {
  /** Controlled open state. */
  open: boolean;
  /** Called when the open state should change. */
  onOpenChange: (open: boolean) => void;
  /** Dialog content. */
  children: ReactNode;
  /** Size of the dialog panel. */
  size?: VariantProps<typeof dialogSizeVariants>["size"];
  /** Additional class applied to the content panel. */
  className?: string;
  /** Whether to show the close (X) button. Defaults to true. */
  showClose?: boolean;
}

/**
 * Accessible modal dialog built on Radix UI Dialog with Framer Motion animations.
 *
 * Uses AnimatePresence for scale + fade entrance/exit.
 */
export function Dialog({
  open,
  onOpenChange,
  children,
  size = "md",
  className,
  showClose = true,
}: DialogProps) {
  return (
    <DialogPrimitive.Root open={open} onOpenChange={onOpenChange}>
      <AnimatePresence>
        {open ? (
          <DialogPrimitive.Portal forceMount>
            {/* Overlay */}
            <DialogPrimitive.Overlay asChild forceMount>
              <motion.div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.2 }}
              />
            </DialogPrimitive.Overlay>

            {/* Content */}
            <DialogPrimitive.Content asChild forceMount>
              <motion.div
                className={cn("fixed inset-0 z-50 flex items-center justify-center p-4")}
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: 10 }}
                transition={{ type: "spring" as const, damping: 25, stiffness: 300 }}
              >
                <div
                  className={cn(
                    dialogSizeVariants({ size }),
                    "max-h-[85vh] overflow-y-auto",
                    className
                  )}
                >
                  {showClose ? (
                    <DialogPrimitive.Close
                      className={cn(
                        "absolute right-4 top-4 z-10 rounded-md p-1",
                        "text-text-muted hover:text-text-primary hover:bg-bg-subtle",
                        "transition-colors duration-150",
                        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
                      )}
                      aria-label="Close dialog"
                    >
                      <X className="h-4 w-4" />
                    </DialogPrimitive.Close>
                  ) : null}

                  {children}
                </div>
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

/** Props for DialogHeader. */
export type DialogHeaderProps = HTMLAttributes<HTMLDivElement>;

/** Header section with title area and bottom padding. */
export function DialogHeader({ className, ...props }: DialogHeaderProps) {
  return <div className={cn("px-6 pt-6 pb-2", className)} {...props} />;
}

/** Props for DialogBody. */
export type DialogBodyProps = HTMLAttributes<HTMLDivElement>;

/** Scrollable body content area. */
export function DialogBody({ className, ...props }: DialogBodyProps) {
  return <div className={cn("flex-1 px-6 py-4", className)} {...props} />;
}

/** Props for DialogFooter. */
export type DialogFooterProps = HTMLAttributes<HTMLDivElement>;

/** Footer area with flex-end layout for action buttons. */
export function DialogFooter({ className, ...props }: DialogFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-end gap-2 border-t border-border-default px-6 py-4",
        className
      )}
      {...props}
    />
  );
}

/* ─── Title and Description primitives ─── */

/** Props for DialogTitle. */
export type DialogTitleProps = HTMLAttributes<HTMLHeadingElement>;

/** Accessible dialog title. Renders as an h2. */
export function DialogTitle({ className, ...props }: DialogTitleProps) {
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

/** Props for DialogDescription. */
export type DialogDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** Accessible dialog description paragraph. */
export function DialogDescription({ className, ...props }: DialogDescriptionProps) {
  return (
    <DialogPrimitive.Description
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

/* ─── Re-export trigger for external usage ─── */
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogClose = DialogPrimitive.Close;
