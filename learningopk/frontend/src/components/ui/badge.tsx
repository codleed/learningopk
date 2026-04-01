import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── CVA Badge Variants ─── */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1 font-semibold",
    "rounded-full border",
    "transition-colors duration-150",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "border-border-default bg-bg-subtle text-text-secondary",
        ].join(" "),
        primary: [
          "border-accent-primary/20 bg-accent-primary-light text-accent-primary",
        ].join(" "),
        success: [
          "border-accent-success/20 bg-accent-success-light text-accent-success",
        ].join(" "),
        warning: [
          "border-accent-warning/20 bg-accent-warning-light text-accent-warning",
        ].join(" "),
        danger: [
          "border-accent-danger/20 bg-accent-danger-light text-accent-danger",
        ].join(" "),
        outline: [
          "border-border-strong bg-transparent text-text-primary",
        ].join(" "),
        /* ── Backward-compatible aliases ── */
        neutral: [
          "border-border-default bg-bg-subtle text-text-secondary",
        ].join(" "),
        info: [
          "border-accent-primary/20 bg-accent-primary-light text-accent-primary",
        ].join(" "),
        error: [
          "border-accent-danger/20 bg-accent-danger-light text-accent-danger",
        ].join(" "),
      },
      size: {
        sm: "px-2 py-0.5 text-[10px] leading-tight",
        md: "px-2.5 py-0.5 text-xs leading-normal",
        lg: "px-3 py-1 text-sm leading-normal",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
);

/** Props for the Badge component. */
export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof badgeVariants> {}

/**
 * Inline badge for labelling, status indication, and categorisation.
 *
 * Uses CSS-variable–based colors from the design token system.
 */
export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return (
    <span
      className={cn(badgeVariants({ variant, size }), className)}
      {...props}
    />
  );
}

/* ─── StatusPill convenience wrapper ─── */

type StatusPillTone = "default" | "primary" | "success" | "warning" | "danger" | "outline" | "neutral" | "info" | "error";

/** Props for the StatusPill component. */
interface StatusPillProps {
  /** Display label. */
  label: string;
  /** Visual tone. Maps to Badge variant. */
  tone?: StatusPillTone;
  /** Additional CSS classes. */
  className?: string;
}

/**
 * Convenience wrapper around Badge for status indicators.
 */
export function StatusPill({ label, tone = "default", className }: StatusPillProps) {
  return (
    <Badge variant={tone} className={className}>
      {label}
    </Badge>
  );
}

export { badgeVariants };
