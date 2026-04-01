"use client";

import { motion } from "framer-motion";
import { Star } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for the gamification XP progress bar. */
export interface XPBarProps {
  /** Current experience points accumulated in this level. */
  currentXP: number;
  /** Total XP required to reach the next level. */
  maxXP: number;
  /** Current player level. */
  level: number;
  /** Additional CSS class names for the root wrapper. */
  className?: string;
}

/**
 * Gamification XP progress bar with animated fill, level badge, and XP counter.
 * The fill bar animates on mount and on value changes via Framer Motion.
 */
export function XPBar({
  currentXP,
  maxXP,
  level,
  className,
}: XPBarProps) {
  const safeMax = Math.max(maxXP, 1);
  const percentage = Math.min((currentXP / safeMax) * 100, 100);

  return (
    <div className={cn("flex items-center gap-3", className)}>
      {/* Level badge */}
      <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-accent-primary-light">
        <Star
          className="h-4 w-4 text-accent-primary"
          fill="var(--accent-primary)"
          aria-hidden="true"
        />
      </div>
      <span className="text-sm font-bold text-accent-primary tabular-nums">
        Lv.{level}
      </span>

      {/* Progress bar */}
      <div className="relative flex-1">
        <div className="h-3 w-full overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className="h-full rounded-full"
            style={{
              background:
                "linear-gradient(90deg, var(--accent-primary), var(--accent-info))",
            }}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </div>
      </div>

      {/* XP text */}
      <span className="shrink-0 text-xs font-medium tabular-nums text-text-secondary">
        {currentXP.toLocaleString()}/{safeMax.toLocaleString()} XP
      </span>
    </div>
  );
}
