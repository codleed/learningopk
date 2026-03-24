"use client";

import { useState, useCallback, useRef } from "react";

import { motion, useReducedMotion } from "framer-motion";
import { EmptyState } from "@/components/ui/states";
import type { QuizAccuracyPoint } from "@/lib/stats-metrics";

type QuizPerformanceChartProps = {
  points: QuizAccuracyPoint[];
};

interface TooltipState {
  visible: boolean;
  x: number;
  y: number;
  label: string;
  percentage: number;
  movingAverage: number;
}

export function QuizPerformanceChart({ points }: QuizPerformanceChartProps) {
  const [tooltip, setTooltip] = useState<TooltipState>({
    visible: false,
    x: 0,
    y: 0,
    label: "",
    percentage: 0,
    movingAverage: 0,
  });
  const [activePoint, setActivePoint] = useState<number | null>(null);
  const prefersReducedMotion = useReducedMotion();
  const svgRef = useRef<SVGSVGElement>(null);

  const current = points[points.length - 1];
  const maxIndex = Math.max(1, points.length - 1);

  const toPolylinePoints = (pts: QuizAccuracyPoint[]): string => {
    return pts
      .map((point, index) => {
        const x = (index / maxIndex) * 100;
        const y = 100 - point.movingAverage;
        return `${x},${y}`;
      })
      .join(" ");
  };

  const getPointPosition = useCallback(
    (index: number): { x: number; y: number } => {
      const x = (index / maxIndex) * 100;
      const y = 100 - points[index].movingAverage;
      return { x, y };
    },
    [maxIndex, points]
  );

  const findNearestPoint = useCallback(
    (clientX: number): number | null => {
      if (!svgRef.current) return null;

      const rect = svgRef.current.getBoundingClientRect();
      const x = ((clientX - rect.left) / rect.width) * 100;

      let nearestIndex = null;
      let minDistance = Infinity;

      points.forEach((_, index) => {
        const pos = getPointPosition(index);
        const distance = Math.abs(pos.x - x);
        if (distance < minDistance) {
          minDistance = distance;
          nearestIndex = index;
        }
      });

      return nearestIndex;
    },
    [points, getPointPosition]
  );

  const handleMouseMove = useCallback(
    (e: React.MouseEvent<SVGSVGElement>) => {
      const nearestIndex = findNearestPoint(e.clientX);
      if (nearestIndex === null) return;

      const svg = e.currentTarget;
      const rect = svg.getBoundingClientRect();
      const point = points[nearestIndex];
      const pos = getPointPosition(nearestIndex);

      const x = rect.left + (pos.x / 100) * rect.width;
      const y = rect.top + (pos.y / 100) * rect.height;

      setActivePoint(nearestIndex);
      setTooltip({
        visible: true,
        x,
        y,
        label: point.label,
        percentage: point.percentage,
        movingAverage: point.movingAverage,
      });
    },
    [findNearestPoint, points, getPointPosition]
  );

  const handleMouseLeave = useCallback(() => {
    setActivePoint(null);
    setTooltip((prev) => ({ ...prev, visible: false }));
  }, []);

  if (points.length === 0) {
    return (
      <EmptyState
        title="No quiz attempts yet"
        description="Submit chapter quizzes to populate your accuracy trend."
      />
    );
  }

  const ariaLabel = `Quiz accuracy moving average trend. Latest moving average: ${current?.movingAverage ?? 0}%. Based on ${points.length} quiz attempts.`;

  return (
    <div>
      <div className="rounded-lg border border-border bg-muted/35 p-3">
        <svg
          ref={svgRef}
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          role="img"
          aria-label={ariaLabel}
          className="relative h-28 w-full cursor-crosshair sm:h-32"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          {/* Area fill under the line */}
          <defs>
            <linearGradient id="areaGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="var(--primary)" stopOpacity="0.3" />
              <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.05" />
            </linearGradient>
            <filter id="glow">
              <feGaussianBlur stdDeviation="1" result="coloredBlur" />
              <feMerge>
                <feMergeNode in="coloredBlur" />
                <feMergeNode in="SourceGraphic" />
              </feMerge>
            </filter>
          </defs>

          {/* Area fill */}
          <motion.path
            d={`M ${toPolylinePoints(points).replace(/ /g, " L ")} L 100,100 L 0,100 Z`}
            fill="url(#areaGradient)"
            initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          />

          {/* Moving average line (dashed) */}
          <motion.polyline
            points={toPolylinePoints(points)}
            fill="none"
            stroke="var(--primary)"
            strokeWidth="2"
            strokeDasharray="4 2"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={prefersReducedMotion ? { pathLength: 1 } : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.8, ease: [0.25, 0.1, 0.25, 1] }}
          />

          {/* Data points */}
          {points.map((point, index) => {
            const pos = getPointPosition(index);
            const isLatest = index === points.length - 1;
            const isActive = activePoint === index;

            return (
              <motion.circle
                key={`point-${index}`}
                cx={pos.x}
                cy={pos.y}
                r={isLatest ? 3 : isActive ? 2.5 : 2}
                fill={isLatest ? "var(--primary)" : "var(--foreground)"}
                stroke={isLatest ? "var(--foreground)" : "var(--card)"}
                strokeWidth="0.5"
                filter={isLatest ? "url(#glow)" : undefined}
                initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0, scale: 0 }}
                animate={prefersReducedMotion ? { opacity: 1 } : { opacity: 1, scale: 1 }}
                transition={{
                  duration: 0.3,
                  delay: prefersReducedMotion ? 0 : 0.8 + index * 0.05,
                  ease: [0.25, 0.1, 0.25, 1],
                }}
                tabIndex={0}
                role="img"
                aria-label={`Quiz on ${point.label}: ${point.percentage}% accuracy, ${point.movingAverage}% moving average.`}
                style={{ cursor: "pointer" }}
              />
            );
          })}
        </svg>
      </div>

      {/* Summary below chart */}
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
        <p className="text-sm text-foreground">
          Latest average:{" "}
          <span className="font-semibold" style={{ fontFamily: "var(--font-mono)" }}>
            {current?.movingAverage ?? 0}%
          </span>
        </p>
        <p className="text-xs text-muted-foreground">
          Based on last {points.length} quiz attempts
        </p>
      </div>

      {/* Tooltip */}
      {tooltip.visible && (
        <div
          className="pointer-events-none fixed z-50 rounded-md border border-border bg-[--popover] px-3 py-2 shadow-[var(--shadow-md)]"
          style={{
            left: tooltip.x,
            top: tooltip.y - 8,
            transform: "translate(-50%, -100%)",
          }}
          role="tooltip"
        >
          <p
            className="whitespace-nowrap text-xs font-semibold text-foreground"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            {tooltip.label}
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            {tooltip.percentage}% accuracy ({tooltip.movingAverage}% avg)
          </p>
        </div>
      )}
    </div>
  );
}
