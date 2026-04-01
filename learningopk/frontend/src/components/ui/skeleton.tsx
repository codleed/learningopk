import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── CVA Skeleton Variants ─── */
const skeletonVariants = cva(
  [
    "bg-bg-subtle",
    "bg-[length:200%_100%]",
    "bg-[linear-gradient(90deg,transparent_0%,var(--bg-elevated)_50%,transparent_100%)]",
    "animate-shimmer",
  ].join(" "),
  {
    variants: {
      variant: {
        text: "h-4 w-full rounded",
        circular: "rounded-full",
        rectangular: "rounded-lg",
        card: "rounded-xl h-40 w-full",
      },
    },
    defaultVariants: {
      variant: "rectangular",
    },
  }
);

/** Props for the Skeleton component. */
export interface SkeletonProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof skeletonVariants> {}

/**
 * Skeleton loading placeholder with shimmer animation.
 *
 * Variants: text (line), circular, rectangular, card.
 * Uses CSS `animate-shimmer` keyframes defined in globals.css.
 */
export function Skeleton({ className, variant, ...props }: SkeletonProps) {
  return (
    <div
      className={cn(skeletonVariants({ variant }), className)}
      aria-hidden="true"
      {...props}
    />
  );
}

/* ─── Pre-built SkeletonCard ─── */

/** Props for the SkeletonCard compound component. */
export interface SkeletonCardProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Pre-built card loading state with avatar, title, body lines, and badges.
 */
export function SkeletonCard({ className, ...props }: SkeletonCardProps) {
  return (
    <div
      className={cn(
        "space-y-4 rounded-xl border border-border-default bg-bg-surface p-5",
        className
      )}
      aria-hidden="true"
      {...props}
    >
      <div className="flex items-center gap-3">
        <Skeleton variant="circular" className="h-10 w-10" />
        <div className="flex-1 space-y-2">
          <Skeleton variant="text" className="h-5 w-3/4" />
          <Skeleton variant="text" className="h-3 w-1/2" />
        </div>
      </div>
      <div className="space-y-2">
        <Skeleton variant="text" className="w-full" />
        <Skeleton variant="text" className="w-5/6" />
      </div>
      <div className="flex gap-2">
        <Skeleton variant="rectangular" className="h-6 w-16 rounded-full" />
        <Skeleton variant="rectangular" className="h-6 w-12 rounded-full" />
      </div>
    </div>
  );
}

/* ─── Legacy compound skeletons kept for backward-compat ─── */

/** @internal Table skeleton. */
export function SkeletonTable({
  rows = 5,
  cols = 4,
  className,
  ...props
}: SkeletonProps & { rows?: number; cols?: number }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true" {...props}>
      <div className="flex gap-4 border-b border-border-default pb-2">
        {Array.from({ length: cols }).map((_, i) => (
          <Skeleton key={i} variant="text" className="flex-1" />
        ))}
      </div>
      {Array.from({ length: rows }).map((_, rowIndex) => (
        <div key={rowIndex} className="flex gap-4">
          {Array.from({ length: cols }).map((_, colIndex) => (
            <Skeleton key={colIndex} variant="text" className="flex-1" />
          ))}
        </div>
      ))}
    </div>
  );
}

/** @internal List skeleton. */
export function SkeletonList({
  items = 3,
  className,
  ...props
}: SkeletonProps & { items?: number }) {
  return (
    <div className={cn("space-y-3", className)} aria-hidden="true" {...props}>
      {Array.from({ length: items }).map((_, i) => (
        <div
          key={i}
          className="flex items-center gap-3 rounded-xl border border-border-default bg-bg-surface p-3"
        >
          <Skeleton variant="circular" className="h-10 w-10" />
          <div className="flex-1 space-y-2">
            <Skeleton variant="text" className="h-5 w-3/4" />
            <Skeleton variant="text" className="h-3 w-2/3" />
          </div>
        </div>
      ))}
    </div>
  );
}
