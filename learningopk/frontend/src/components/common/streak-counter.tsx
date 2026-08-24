"use client";

import { cva, type VariantProps } from "class-variance-authority";
import { Flame } from "lucide-react";
import { motion } from "framer-motion";

import { cn } from "@/lib/utils";

/* ─── CVA size variants ─── */
const streakVariants = cva(
  "inline-flex items-center gap-1.5 rounded-full font-bold transition-colors",
  {
    variants: {
      size: {
        sm: "px-2.5 py-1 text-xs",
        md: "px-3 py-1.5 text-sm",
        lg: "px-4 py-2 text-base",
      },
    },
    defaultVariants: {
      size: "md",
    },
  }
);

const iconSizeMap: Record<NonNullable<StreakSize>, string> = {
  sm: "h-3.5 w-3.5",
  md: "h-4 w-4",
  lg: "h-5 w-5",
};

const labelSizeMap: Record<NonNullable<StreakSize>, string> = {
  sm: "text-[0.625rem]",
  md: "text-xs",
  lg: "text-sm",
};

type StreakSize = VariantProps<typeof streakVariants>["size"];

/** Props for the streak counter component. */
export interface StreakCounterProps {
  /** Number of consecutive active days. */
  count: number;
  /** Size variant for the badge. */
  size?: StreakSize;
  /** Additional CSS class names. */
  className?: string;
}

/**
 * Gamification streak counter with flame icon and pulse animation.
 * Shows an active fire when count > 0 (orange tint + pulse).
 * Grayed out when count === 0.
 */
export function StreakCounter({ count, size = "md", className }: StreakCounterProps) {
  const isActive = count > 0;
  const sizeKey = size ?? "md";

  return (
    <motion.div
      className={cn(
        streakVariants({ size }),
        isActive ? "bg-accent-warning/15 text-accent-warning" : "bg-bg-subtle text-text-muted",
        className
      )}
      animate={isActive ? { scale: [1, 1.05, 1] } : { scale: 1 }}
      transition={isActive ? { duration: 2, repeat: Infinity, ease: "easeInOut" } : {}}
    >
      {/* Flame icon */}
      <Flame
        className={cn(iconSizeMap[sizeKey], isActive ? "text-accent-warning" : "text-text-muted")}
        fill={isActive ? "var(--accent-warning)" : "none"}
        aria-hidden="true"
      />

      {/* Count */}
      <span className="tabular-nums">{count}</span>

      {/* Label */}
      <span
        className={cn(
          "font-medium",
          labelSizeMap[sizeKey],
          isActive ? "text-accent-warning/80" : "text-text-muted"
        )}
      >
        day{count !== 1 ? "s" : ""}
      </span>
    </motion.div>
  );
}
