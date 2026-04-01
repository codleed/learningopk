"use client";

import { useState, type HTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";
import {
  Info,
  CheckCircle2,
  TriangleAlert,
  CircleAlert,
  X,
} from "lucide-react";

import { cn } from "@/lib/utils";

/* ─── Variant icons ─── */
const variantIcons: Record<string, ReactNode> = {
  info: <Info className="h-5 w-5" aria-hidden />,
  success: <CheckCircle2 className="h-5 w-5" aria-hidden />,
  warning: <TriangleAlert className="h-5 w-5" aria-hidden />,
  danger: <CircleAlert className="h-5 w-5" aria-hidden />,
};

/* ─── CVA Variants ─── */
const alertVariants = cva(
  [
    "relative flex gap-3 rounded-lg border px-4 py-3 text-sm",
    "transition-all duration-200",
  ].join(" "),
  {
    variants: {
      variant: {
        info: [
          "border-accent-info/30 bg-accent-info-light text-accent-info",
        ].join(" "),
        success: [
          "border-accent-success/30 bg-accent-success-light text-accent-success",
        ].join(" "),
        warning: [
          "border-accent-warning/30 bg-accent-warning-light text-accent-warning",
        ].join(" "),
        danger: [
          "border-accent-danger/30 bg-accent-danger-light text-accent-danger",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "info",
    },
  }
);

/** Props for the Alert component. */
export interface AlertProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof alertVariants> {
  /** Alert title text. */
  title?: string;
  /** Whether the alert can be dismissed with an X button. */
  dismissible?: boolean;
  /** Callback fired when the alert is dismissed. */
  onDismiss?: () => void;
  /** Custom icon override. */
  icon?: ReactNode;
}

/**
 * Alert banner with semantic variant colors, icon, and optional dismiss.
 *
 * Variants: info | success | warning | danger.
 */
export function Alert({
  className,
  variant = "info",
  title,
  children,
  dismissible = false,
  onDismiss,
  icon,
  ...props
}: AlertProps) {
  const [visible, setVisible] = useState(true);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  const displayIcon = icon ?? variantIcons[variant ?? "info"];

  return (
    <div
      className={cn(alertVariants({ variant }), className)}
      role="alert"
      {...props}
    >
      <span className="mt-0.5 shrink-0">{displayIcon}</span>

      <div className="flex-1 min-w-0">
        {title ? (
          <p className="font-semibold">{title}</p>
        ) : null}
        {children ? (
          <div className={cn(title && "mt-1", "text-current/80")}>
            {children}
          </div>
        ) : null}
      </div>

      {dismissible ? (
        <button
          type="button"
          onClick={handleDismiss}
          className={cn(
            "shrink-0 rounded p-0.5 transition-colors duration-150",
            "text-current/60 hover:text-current hover:bg-current/10",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/40"
          )}
          aria-label="Dismiss alert"
        >
          <X className="h-4 w-4" />
        </button>
      ) : null}
    </div>
  );
}
