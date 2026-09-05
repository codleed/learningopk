"use client";

import React, { useEffect, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { TrendingDown, TrendingUp, Minus } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

/** Trend indicator with direction and magnitude. */
export interface StatTrend {
  /** Percentage or absolute change value. */
  value: number;
  /** Direction of the change. */
  direction: "up" | "down" | "neutral";
}

/** Props for the stat card component. */
export interface StatCardProps {
  /** Descriptive label shown above the value. Accepts a string or ReactNode (e.g. MetricLabel). */
  label: React.ReactNode;
  /** The metric value (number or formatted string). */
  value: string | number;
  /** Lucide icon rendered in the card. */
  icon: LucideIcon;
  /** Optional trend indicator with arrow and color coding. */
  trend?: StatTrend;
  /** CSS color string for the icon accent (applied as inline style). */
  accentColor?: string;
  /** Show skeleton placeholders instead of content. */
  loading?: boolean;
}

/* ─── Trend icon map ─── */
const TREND_ICONS: Record<StatTrend["direction"], LucideIcon> = {
  up: TrendingUp,
  down: TrendingDown,
  neutral: Minus,
};

const TREND_COLORS: Record<StatTrend["direction"], string> = {
  up: "text-accent-success",
  down: "text-accent-danger",
  neutral: "text-text-muted",
};

/**
 * Animated stat card with icon, value, optional trend indicator, and loading skeleton.
 * The numeric value animates on mount and change via Framer Motion spring.
 */
export function StatCard({
  label,
  value,
  icon: Icon,
  trend,
  accentColor,
  loading = false,
}: StatCardProps) {
  /* ─── Animated numeric display ─── */
  const numericValue = typeof value === "number" ? value : parseFloat(value);
  const isNumeric = !Number.isNaN(numericValue);

  const motionVal = useMotionValue(0);
  const springVal = useSpring(motionVal, {
    stiffness: 100,
    damping: 30,
    restDelta: 0.01,
  });

  const displayRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (isNumeric) {
      motionVal.set(numericValue);
    }
  }, [numericValue, isNumeric, motionVal]);

  /* Update the display node reactively */
  const roundedSpring = useTransform(springVal, (v) => {
    // Preserve decimal places from original value
    if (typeof value === "string" && value.includes(".")) {
      const decimals = value.split(".")[1]?.length ?? 0;
      return v.toFixed(decimals);
    }
    return Math.round(v).toLocaleString();
  });

  useEffect(() => {
    const unsubscribe = roundedSpring.on("change", (v) => {
      if (displayRef.current) {
        displayRef.current.textContent = String(v);
      }
    });
    return unsubscribe;
  }, [roundedSpring]);

  /* ─── Loading skeleton ─── */
  if (loading) {
    return (
      <div className="rounded-lg border border-border-default bg-bg-surface p-4">
        <div className="flex items-center justify-between">
          <Skeleton className="h-4 w-20" />
          <Skeleton variant="circular" className="h-9 w-9" />
        </div>
        <div className="mt-3 space-y-2">
          <Skeleton className="h-8 w-24" />
          <Skeleton className="h-4 w-16" />
        </div>
      </div>
    );
  }

  /* ─── Trend display ─── */
  const TrendIcon = trend ? TREND_ICONS[trend.direction] : null;
  const trendColor = trend ? TREND_COLORS[trend.direction] : "";

  return (
    <motion.div
      className="rounded-lg border border-border-default bg-bg-surface p-4 transition-shadow hover:shadow-[var(--shadow-card)]"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
    >
      {/* Top row: label + icon */}
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-text-secondary">{label}</span>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-lg"
          style={{
            backgroundColor: accentColor ? `${accentColor}1A` : "var(--accent-primary-light)",
            color: accentColor ?? "var(--accent-primary)",
          }}
        >
          <Icon className="h-4.5 w-4.5" />
        </div>
      </div>

      {/* Value */}
      <div className="mt-3">
        <span className="text-2xl font-bold text-text-primary font-display tabular-nums">
          {isNumeric ? (
            <motion.span ref={displayRef}>
              {typeof value === "number" ? Math.round(value).toLocaleString() : value}
            </motion.span>
          ) : (
            value
          )}
        </span>
      </div>

      {/* Trend */}
      {trend && TrendIcon ? (
        <div className={cn("mt-1.5 flex items-center gap-1 text-xs font-medium", trendColor)}>
          <TrendIcon className="h-3.5 w-3.5" />
          <span>
            {trend.direction !== "neutral" && trend.value > 0 ? "+" : ""}
            {trend.value}%
          </span>
        </div>
      ) : null}
    </motion.div>
  );
}
