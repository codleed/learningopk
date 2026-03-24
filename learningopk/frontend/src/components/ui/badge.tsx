import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.05em]",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-[var(--info)]/20 text-[var(--info)] dark:bg-[var(--info)]/30 dark:text-[var(--info)]",
        success: "bg-success/20 text-success dark:bg-success/30 dark:text-success",
        warning: "bg-[var(--warning)]/20 text-[var(--warning)] dark:bg-[var(--warning)]/30 dark:text-[var(--warning)]",
        error: "bg-destructive/20 text-destructive dark:bg-destructive/30 dark:text-destructive"
      }
    },
    defaultVariants: {
      variant: "neutral"
    }
  }
);

export type BadgeProps = HTMLAttributes<HTMLSpanElement> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant }), className)} {...props} />;
}

type StatusPillTone = "neutral" | "info" | "success" | "warning" | "error";

type StatusPillProps = {
  label: string;
  tone?: StatusPillTone;
  className?: string;
};

export function StatusPill({ label, tone = "neutral", className }: StatusPillProps) {
  return <Badge variant={tone} className={className}>{label}</Badge>;
}
