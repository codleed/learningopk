"use client";

import { useState } from "react";

import { motion, useReducedMotion } from "framer-motion";
import type { WeeklyStudyTrendPoint } from "@/lib/stats-metrics";

type StudyVolumeChartProps = {
  points: WeeklyStudyTrendPoint[];
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  content: string;
}

export function StudyVolumeChart({ points }: StudyVolumeChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    content: "",
  });
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();

  if (points.length === 0) {
    return (
      <div className="flex h-40 items-center justify-center rounded-lg bg-muted/35">
        <p className="text-sm text-muted-foreground">
          No study data yet. Complete activities to see your weekly volume.
        </p>
      </div>
    );
  }

  const maxHours = Math.max(...points.map((p) => p.estimatedHours), 1);
  const maxLabel = points.reduce((max, point) => {
    return point.estimatedHours > max.estimatedHours ? point : max;
  }, points[0]);

  const ariaLabel = `Weekly study volume bar chart. Last ${points.length} weeks. Highest: ${maxHours} hours in week of ${maxLabel.label}.`;

  const weekLabels: Record<string, string> = {};
  points.forEach((p) => {
    const [start, end] = p.label.split("-");
    if (start && end) {
      weekLabels[p.label] = start.replace(/,/g, "");
    }
  });

  return (
    <div className="relative" role="img" aria-label={ariaLabel}>
      {/* Chart Area */}
      <div className="flex h-36 items-end gap-1 sm:gap-2">
        {points.map((point, index) => {
          const heightPercent = Math.max(4, Math.round((point.estimatedHours / maxHours) * 100));
          const isHovered = hoveredIndex === index;

          return (
            <motion.div
              key={point.label}
              className="group relative flex min-w-0 flex-1 flex-col items-center justify-end"
              initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{
                duration: 0.5,
                delay: prefersReducedMotion ? 0 : 0.05 * index,
                ease: "easeOut",
              }}
            >
              {/* Value label above bar */}
              <span
                className={`mb-1 text-[10px] font-semibold tabular-nums transition-colors duration-100 sm:text-xs ${
                  isHovered ? "text-[var(--primary-hover)]" : "text-muted-foreground"
                }`}
                style={{ fontFamily: "var(--font-mono)" }}
              >
                {point.estimatedHours}h
              </span>

              {/* Bar */}
              <div
                className="relative w-full cursor-default"
                onMouseEnter={(e) => {
                  setHoveredIndex(index);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    visible: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    content: `${point.label}: ${point.estimatedHours} estimated hours (${point.activityCount} events)`,
                  });
                }}
                onMouseLeave={() => {
                  setHoveredIndex(null);
                  setTooltip((prev) => ({ ...prev, visible: false }));
                }}
                onFocus={(e) => {
                  setHoveredIndex(index);
                  const rect = e.currentTarget.getBoundingClientRect();
                  setTooltip({
                    visible: true,
                    x: rect.left + rect.width / 2,
                    y: rect.top,
                    content: `${point.label}: ${point.estimatedHours} estimated hours (${point.activityCount} events)`,
                  });
                }}
                onBlur={() => {
                  setHoveredIndex(null);
                  setTooltip((prev) => ({ ...prev, visible: false }));
                }}
                tabIndex={0}
                role="img"
                aria-label={`Week of ${point.label}: ${point.estimatedHours} estimated hours, ${point.activityCount} activity events.`}
              >
                <motion.div
                  className="w-full rounded-t-sm transition-colors duration-100"
                  style={{
                    height: `${heightPercent}%`,
                    minHeight: "8px",
                    backgroundColor: isHovered ? "var(--primary-hover)" : "var(--primary)",
                  }}
                  whileHover={prefersReducedMotion ? {} : { scaleX: 1.02 }}
                />
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* Week Labels - 2 column grid for better readability */}
      <div className="mt-3 grid grid-cols-4 gap-1 sm:gap-2">
        {points.map((point, index) => {
          const [start] = point.label.split("-");
          return (
            <p
              key={point.label}
              className={`truncate text-center text-[10px] transition-colors duration-100 sm:text-[11px] ${
                hoveredIndex === index ? "text-foreground font-medium" : "text-muted-foreground"
              }`}
            >
              {start?.replace(/,/g, "")}
            </p>
          );
        })}
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-border/50 bg-[--popover] px-3 py-2 shadow-[var(--shadow-md)]"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
          }}
          role="tooltip"
        >
          <p
            className="whitespace-nowrap text-xs font-medium"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {tooltip.content}
          </p>
        </div>
      )}
    </div>
  );
}
