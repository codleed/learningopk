"use client";

import { type HTMLAttributes } from "react";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Shared color variants ─── */
const progressColorVariants = cva("", {
  variants: {
    colorVariant: {
      primary: "text-accent-primary",
      success: "text-accent-success",
      warning: "text-accent-warning",
      danger: "text-accent-danger",
    },
  },
  defaultVariants: {
    colorVariant: "primary",
  },
});

const fillColorMap: Record<string, string> = {
  primary: "bg-accent-primary",
  success: "bg-accent-success",
  warning: "bg-accent-warning",
  danger: "bg-accent-danger",
};

const strokeColorMap: Record<string, string> = {
  primary: "var(--accent-primary)",
  success: "var(--accent-success)",
  warning: "var(--accent-warning)",
  danger: "var(--accent-danger)",
};

/* ═══════════════════════════════════════════
   Linear Progress
   ═══════════════════════════════════════════ */

/** Props for the LinearProgress component. */
export interface LinearProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof progressColorVariants> {
  /** Current value (0–100). */
  value: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** Show a striped pattern on the fill bar. */
  striped?: boolean;
  /** Optional label shown above the bar. */
  label?: string;
  /** Show the percentage text. */
  showValue?: boolean;
  /** Height of the bar. Defaults to "md". */
  barSize?: "sm" | "md" | "lg";
}

/**
 * Animated linear progress bar with optional stripes and label.
 *
 * Fills from 0 to the target value on mount using Framer Motion.
 */
export function LinearProgress({
  className,
  colorVariant = "primary",
  value,
  max = 100,
  striped = false,
  label,
  showValue = false,
  barSize = "md",
  ...props
}: LinearProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const fill = fillColorMap[colorVariant ?? "primary"] ?? fillColorMap.primary;

  const heightClass =
    barSize === "sm" ? "h-1.5" : barSize === "lg" ? "h-4" : "h-2.5";

  return (
    <div className={cn("w-full", className)} {...props}>
      {(label || showValue) ? (
        <div className="mb-1.5 flex items-center justify-between text-xs">
          {label ? (
            <span className="font-medium text-text-primary">{label}</span>
          ) : <span />}
          {showValue ? (
            <span className="tabular-nums text-text-secondary">
              {Math.round(percent)}%
            </span>
          ) : null}
        </div>
      ) : null}

      <div
        className={cn(
          "w-full overflow-hidden rounded-full bg-bg-subtle",
          heightClass
        )}
        role="progressbar"
        aria-valuenow={value}
        aria-valuemin={0}
        aria-valuemax={max}
        aria-label={label ?? "Progress"}
      >
        <motion.div
          className={cn(
            "h-full rounded-full",
            fill,
            striped && [
              "bg-[length:20px_20px]",
              "bg-[linear-gradient(45deg,rgba(255,255,255,.15)_25%,transparent_25%,transparent_50%,rgba(255,255,255,.15)_50%,rgba(255,255,255,.15)_75%,transparent_75%,transparent)]",
            ]
          )}
          initial={{ width: 0 }}
          animate={{ width: `${percent}%` }}
          transition={{ duration: 0.8, ease: "easeOut" }}
        />
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   Circular / Ring Progress (XP Rings)
   ═══════════════════════════════════════════ */

/** Props for the CircularProgress component. */
export interface CircularProgressProps
  extends Omit<HTMLAttributes<HTMLDivElement>, "children">,
    VariantProps<typeof progressColorVariants> {
  /** Current value (0–100). */
  value: number;
  /** Maximum value. Defaults to 100. */
  max?: number;
  /** Diameter of the SVG in pixels. */
  diameter?: number;
  /** Stroke width of the ring. */
  strokeWidth?: number;
  /** Show the percentage text in the center. */
  showValue?: boolean;
  /** Custom label rendered in the center instead of percentage. */
  label?: string;
}

/**
 * Animated circular/ring progress indicator, ideal for XP rings.
 *
 * Uses an SVG donut and animates the stroke-dashoffset on mount.
 */
export function CircularProgress({
  className,
  colorVariant = "primary",
  value,
  max = 100,
  diameter = 80,
  strokeWidth = 6,
  showValue = true,
  label,
  ...props
}: CircularProgressProps) {
  const percent = Math.min(100, Math.max(0, (value / max) * 100));
  const radius = (diameter - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeColor = strokeColorMap[colorVariant ?? "primary"] ?? strokeColorMap.primary;

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      role="progressbar"
      aria-valuenow={value}
      aria-valuemin={0}
      aria-valuemax={max}
      aria-label={label ?? "Progress"}
      {...props}
    >
      <svg
        width={diameter}
        height={diameter}
        viewBox={`0 0 ${diameter} ${diameter}`}
        className="-rotate-90"
      >
        {/* Background ring */}
        <circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke="var(--bg-subtle)"
          strokeWidth={strokeWidth}
        />
        {/* Foreground ring */}
        <motion.circle
          cx={diameter / 2}
          cy={diameter / 2}
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{
            strokeDashoffset: circumference - (percent / 100) * circumference,
          }}
          transition={{ duration: 1, ease: "easeOut" }}
        />
      </svg>

      {(showValue || label) ? (
        <span className="absolute inset-0 flex items-center justify-center">
          <span className="text-sm font-semibold tabular-nums text-text-primary">
            {label ?? `${Math.round(percent)}%`}
          </span>
        </span>
      ) : null}
    </div>
  );
}
