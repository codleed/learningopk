"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";

/**
 * Column breakpoint configuration for responsive grid layouts.
 * Each key defines the column count at that Tailwind breakpoint.
 */
export interface GridColumns {
  /** Columns at ≥640px (small screens). */
  sm: number;
  /** Columns at ≥768px (medium screens). */
  md: number;
  /** Columns at ≥1024px (large screens). */
  lg: number;
  /** Columns at ≥1280px (extra-large screens). */
  xl: number;
}

/**
 * Props for the virtualized grid component.
 *
 * @typeParam T - The type of each item in the data array.
 */
export interface VirtualGridProps<T> {
  /** Array of data items to render. */
  items: T[];
  /** Number of columns at each responsive breakpoint. */
  columns: GridColumns;
  /** Estimated pixel height for each row (used before measurement). */
  estimateHeight: number;
  /** Render function called for each visible item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Gap in pixels between grid cells. */
  gap?: number;
  /** Additional CSS class names for the scroll container. */
  className?: string;
}

/* ─── Breakpoint constants (Tailwind defaults) ─── */
const BREAKPOINTS = {
  sm: 640,
  md: 768,
  lg: 1024,
  xl: 1280,
} as const;

/**
 * Returns the number of columns appropriate for the given viewport width.
 */
function getColumnsForWidth(width: number, columns: GridColumns): number {
  if (width >= BREAKPOINTS.xl) return columns.xl;
  if (width >= BREAKPOINTS.lg) return columns.lg;
  if (width >= BREAKPOINTS.md) return columns.md;
  if (width >= BREAKPOINTS.sm) return columns.sm;
  // Below sm — single column
  return 1;
}

/**
 * High-performance virtualized grid built on @tanstack/react-virtual.
 * Responds to viewport width to adjust column count per breakpoint,
 * and virtualizes rows to keep DOM node count minimal.
 */
export function VirtualGrid<T>({
  items,
  columns,
  estimateHeight,
  renderItem,
  gap = 16,
  className,
}: VirtualGridProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [columnCount, setColumnCount] = useState<number>(columns.md);

  /* ─── Responsive column count ─── */
  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const width = entry.contentRect.width;
        setColumnCount(getColumnsForWidth(width, columns));
      }
    });

    // Initial measurement
    setColumnCount(getColumnsForWidth(el.clientWidth, columns));
    observer.observe(el);

    return () => observer.disconnect();
  }, [columns]);

  /* ─── Chunk items into rows ─── */
  const rows = useMemo(() => {
    const result: Array<Array<{ item: T; index: number }>> = [];
    for (let i = 0; i < items.length; i += columnCount) {
      const row: Array<{ item: T; index: number }> = [];
      for (let j = 0; j < columnCount && i + j < items.length; j++) {
        const item = items[i + j];
        if (item !== undefined) {
          row.push({ item, index: i + j });
        }
      }
      result.push(row);
    }
    return result;
  }, [items, columnCount]);

  /* ─── Virtualizer ─── */
  const virtualizer = useVirtualizer({
    count: rows.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateHeight + gap,
    overscan: 3,
  });

  const virtualRows = virtualizer.getVirtualItems();

  return (
    <div ref={parentRef} className={cn("overflow-auto scrollbar-thin", className)}>
      <div className="relative w-full" style={{ height: `${virtualizer.getTotalSize()}px` }}>
        {virtualRows.map((virtualRow) => {
          const row = rows[virtualRow.index];
          if (!row) return null;

          return (
            <div
              key={virtualRow.key}
              data-index={virtualRow.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualRow.start}px)`,
                paddingBottom: `${gap}px`,
              }}
            >
              <div
                className="grid"
                style={{
                  gridTemplateColumns: `repeat(${columnCount}, minmax(0, 1fr))`,
                  gap: `${gap}px`,
                }}
              >
                {row.map(({ item, index }) => (
                  <div key={index}>{renderItem(item, index)}</div>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
