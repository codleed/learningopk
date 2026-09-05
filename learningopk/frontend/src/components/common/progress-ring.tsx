"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";

import { cn } from "@/lib/utils";

/** Props for the SVG circular progress indicator. */
export interface ProgressRingProps {
  /** Progress percentage from 0 to 100. */
  percentage: number;
  /** Outer diameter of the ring in pixels. */
  size?: number;
  /** Thickness of the ring stroke in pixels. */
  strokeWidth?: number;
  /** Color of the progress arc (CSS color value). Falls back to accent-primary. */
  color?: string;
  /** Text displayed in the center of the ring. */
  label?: string;
  /** Additional CSS class names for the root wrapper. */
  className?: string;
}

/**
 * SVG circular progress ring animated with Framer Motion springs.
 * Displays a percentage arc with an optional centered label.
 */
export function ProgressRing({
  percentage,
  size = 80,
  strokeWidth = 6,
  color,
  label,
  className,
}: ProgressRingProps) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  /* ─── Spring-animated path length ─── */
  const clamped = Math.min(100, Math.max(0, percentage));
  const progress = useMotionValue(0);
  const springProgress = useSpring(progress, {
    stiffness: 80,
    damping: 20,
    restDelta: 0.001,
  });

  useEffect(() => {
    progress.set(clamped / 100);
  }, [clamped, progress]);

  return (
    <div
      className={cn("relative inline-flex items-center justify-center", className)}
      style={{ width: size, height: size }}
      role="progressbar"
      aria-valuenow={clamped}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `${clamped}% progress`}
    >
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
        {/* Background track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke="var(--border-default)"
          strokeWidth={strokeWidth}
        />

        {/* Animated progress arc */}
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          fill="none"
          stroke={color ?? "var(--accent-primary)"}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          style={{
            pathLength: springProgress,
            strokeDashoffset: 0,
          }}
          initial={{ pathLength: 0 }}
        />
      </svg>

      {/* Center label */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {label ? (
          <span className="text-xs font-semibold text-text-primary leading-tight text-center px-1">
            {label}
          </span>
        ) : (
          <span className="text-sm font-bold tabular-nums text-text-primary">
            {Math.round(clamped)}%
          </span>
        )}
      </div>
    </div>
  );
}
