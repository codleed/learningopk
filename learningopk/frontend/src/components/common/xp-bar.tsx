"use client";

import { motion } from "framer-motion";
import { Sparkles } from "lucide-react";

import { cn } from "@/lib/utils";
import { getLevelDefinition, TIER_COLORS } from "@/lib/gamification-types";

/** Props for the gamification XP progress bar. */
export interface XPBarProps {
  /** Current total experience points. */
  currentXP: number;
  /** Total XP required to reach the next level (currentXP + xpToNextLevel). */
  maxXP: number;
  /** Current player level (0–10). */
  level: number;
  /** XP already earned within the current level (for precise progress). */
  xpInCurrentLevel?: number;
  /** Total XP span of the current level. */
  xpRequiredForLevel?: number;
  /** Additional CSS class names for the root wrapper. */
  className?: string;
}

/**
 * Compact XP progress bar with level badge, tier coloring, and animated fill.
 * Shows: level badge · level name · progress bar · XP counter.
 */
export function XPBar({
  currentXP,
  maxXP,
  level,
  xpInCurrentLevel,
  xpRequiredForLevel,
  className,
}: XPBarProps) {
  const levelDef = getLevelDefinition(level);
  const tier = TIER_COLORS[levelDef.tier];

  // Use precise in-level progress if available, otherwise fall back
  const progressXp = xpInCurrentLevel ?? currentXP;
  const totalForLevel = xpRequiredForLevel ?? Math.max(maxXP, 1);
  const safeTotal = Math.max(totalForLevel, 1);
  const percentage = Math.min((progressXp / safeTotal) * 100, 100);

  return (
    <div className={cn("flex items-center gap-2.5", className)}>
      {/* Level badge */}
      <div
        className={cn(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg border",
          tier.badgeBg
        )}
      >
        <Sparkles className={cn("h-4 w-4", tier.badge)} aria-hidden="true" />
      </div>

      {/* Level label */}
      <div className="flex shrink-0 flex-col leading-none">
        <span className={cn("text-[10px] font-semibold uppercase tracking-wider", tier.text)}>
          {levelDef.name}
        </span>
        <span className="text-xs font-bold tabular-nums text-text-primary">Lv.{level}</span>
      </div>

      {/* Progress bar */}
      <div className="relative flex-1">
        <div className="h-2.5 w-full overflow-hidden rounded-full bg-bg-subtle">
          <motion.div
            className={cn("h-full rounded-full bg-gradient-to-r", tier.progress)}
            initial={{ width: 0 }}
            animate={{ width: `${percentage}%` }}
            transition={{
              duration: 0.8,
              ease: [0.4, 0, 0.2, 1],
            }}
          />
        </div>
      </div>

      {/* XP counter */}
      <span className="shrink-0 text-xs font-medium tabular-nums text-text-secondary">
        {currentXP.toLocaleString()} XP
      </span>
    </div>
  );
}
