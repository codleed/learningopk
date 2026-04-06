"use client";

import { Info } from "lucide-react";
import { Tooltip } from "@/components/ui/tooltip";

interface MetricLabelProps {
  /** The metric name to display. */
  label: string;
  /** Explanation shown in the tooltip. */
  explanation: string;
  /** Additional class for the label text. */
  className?: string;
  /** Side of the trigger for the tooltip. */
  side?: "top" | "right" | "bottom" | "left";
}

/**
 * A metric label with an info icon that reveals an explanation tooltip.
 *
 * Used to add transparency to estimated, derived, or composite metrics
 * so users understand how values are calculated.
 */
export function MetricLabel({
  label,
  explanation,
  className,
  side = "top",
}: MetricLabelProps) {
  return (
    <span className={`inline-flex items-center gap-1 ${className ?? ""}`}>
      {label}
      <Tooltip content={explanation} side={side} delayDuration={200}>
        <button
          type="button"
          className="inline-flex items-center justify-center rounded-full text-text-muted transition-colors hover:text-text-secondary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-1"
          aria-label="How this metric is calculated"
        >
          <Info className="h-3 w-3" aria-hidden="true" />
        </button>
      </Tooltip>
    </span>
  );
}
