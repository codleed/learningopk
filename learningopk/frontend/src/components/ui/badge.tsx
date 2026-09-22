import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── CVA Badge Variants ─── */
const badgeVariants = cva(
  [
    "inline-flex items-center gap-1",
    "rounded-[6px] border-0 px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.06em]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: ["bg-accent-tint text-accent"].join(" "),
        primary: ["bg-accent-tint text-accent"].join(" "),
        success: ["bg-accent-tint text-accent"].join(" "),
        warning: ["bg-ochre-tint text-ochre"].join(" "),
        danger: ["bg-danger-tint text-danger"].join(" "),
        outline: ["bg-bg-elevated text-text-secondary"].join(" "),
        /* ── Backward-compatible aliases ── */
        neutral: ["bg-bg-elevated text-text-secondary"].join(" "),
        info: ["bg-accent-tint text-accent"].join(" "),
        error: ["bg-danger-tint text-danger"].join(" "),
      },
      size: {
        sm: "px-1.5 py-px text-[9px] leading-tight",
        md: "px-2 py-0.5 text-[10px] leading-normal",
        lg: "px-2.5 py-1 text-[11px] leading-normal",
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
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {}

/**
 * Inline badge for labelling, status indication, and categorisation.
 *
 * Uses CSS-variable–based colors from the design token system.
 */
export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/* ─── StatusPill convenience wrapper ─── */

type StatusPillTone =
  | "default"
  | "primary"
  | "success"
  | "warning"
  | "danger"
  | "outline"
  | "neutral"
  | "info"
  | "error";

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
