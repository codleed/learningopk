import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold uppercase tracking-[0.05em]",
  {
    variants: {
      variant: {
        neutral: "bg-muted text-muted-foreground",
        info: "bg-blue-100 text-blue-700 dark:bg-blue-900/45 dark:text-blue-200",
        success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-200",
        warning: "bg-amber-100 text-amber-800 dark:bg-amber-900/40 dark:text-amber-200",
        error: "bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-200"
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

