import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type StatusIndicatorStatus = "success" | "warning" | "danger" | "info" | "neutral";

export interface StatusIndicatorProps extends HTMLAttributes<HTMLSpanElement> {
  status: StatusIndicatorStatus;
  label: string;
}

const statusClasses: Record<StatusIndicatorStatus, { dot: string; text: string }> = {
  success: { dot: "bg-accent-success", text: "text-accent-success" },
  warning: { dot: "bg-accent-warning", text: "text-accent-warning" },
  danger: { dot: "bg-accent-danger", text: "text-accent-danger" },
  info: { dot: "bg-accent-info", text: "text-accent-info" },
  neutral: { dot: "bg-text-muted", text: "text-text-secondary" },
};

export function StatusIndicator({ status, label, className, ...props }: StatusIndicatorProps) {
  const classes = statusClasses[status];
  return (
    <span className={cn("inline-flex items-center gap-2 text-sm font-medium", classes.text, className)} {...props}>
      <span className={cn("h-2 w-2 rounded-full", classes.dot)} aria-hidden="true" />
      {label}
    </span>
  );
}
