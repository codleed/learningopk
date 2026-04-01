"use client";

import { useCallback, useEffect, useRef, type ReactNode } from "react";
import { useVirtualizer } from "@tanstack/react-virtual";

import { cn } from "@/lib/utils";

/**
 * Props for the virtualized list component.
 * Renders only the visible items in the viewport for high-performance scrolling.
 *
 * @typeParam T - The type of each item in the data array.
 */
export interface VirtualListProps<T> {
  /** Array of data items to render. */
  items: T[];
  /** Estimated pixel height for each row (used before measurement). */
  estimateSize: number;
  /** Render function called for each visible item. */
  renderItem: (item: T, index: number) => ReactNode;
  /** Number of items to render outside the visible area for smoother scrolling. */
  overscan?: number;
  /** Additional CSS class names for the scroll container. */
  className?: string;
  /** Content shown when the items array is empty and not loading. */
  emptyState?: ReactNode;
  /** Content shown while data is being fetched. */
  loadingState?: ReactNode;
  /** Whether the list is in a loading state. */
  isLoading?: boolean;
  /** Callback fired when the user scrolls near the bottom of the list. */
  onEndReached?: () => void;
  /** Pixel distance from the bottom at which onEndReached fires. */
  endReachedThreshold?: number;
}

/**
 * High-performance virtualized list built on @tanstack/react-virtual.
 * Supports variable-height items via `measureElement`, infinite scroll via
 * `onEndReached`, and optional loading/empty states.
 */
export function VirtualList<T>({
  items,
  estimateSize,
  renderItem,
  overscan = 5,
  className,
  emptyState,
  loadingState,
  isLoading = false,
  onEndReached,
  endReachedThreshold = 200,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: items.length,
    getScrollElement: () => parentRef.current,
    estimateSize: () => estimateSize,
    overscan,
  });

  const virtualItems = virtualizer.getVirtualItems();

  /* ─── Infinite scroll detection ─── */
  const handleScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el || !onEndReached) return;

    const { scrollTop, scrollHeight, clientHeight } = el;
    if (scrollHeight - scrollTop - clientHeight <= endReachedThreshold) {
      onEndReached();
    }
  }, [onEndReached, endReachedThreshold]);

  useEffect(() => {
    const el = parentRef.current;
    if (!el || !onEndReached) return;

    el.addEventListener("scroll", handleScroll, { passive: true });
    return () => el.removeEventListener("scroll", handleScroll);
  }, [handleScroll, onEndReached]);

  /* ─── Loading state ─── */
  if (isLoading && items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {loadingState ?? (
          <div className="flex items-center gap-2 text-text-secondary">
            <div className="h-5 w-5 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
            <span className="text-sm">Loading...</span>
          </div>
        )}
      </div>
    );
  }

  /* ─── Empty state ─── */
  if (!isLoading && items.length === 0) {
    return (
      <div className={cn("flex items-center justify-center p-8", className)}>
        {emptyState ?? (
          <p className="text-sm text-text-muted">No items to display</p>
        )}
      </div>
    );
  }

  return (
    <div
      ref={parentRef}
      className={cn("overflow-auto scrollbar-thin", className)}
    >
      <div
        className="relative w-full"
        style={{ height: `${virtualizer.getTotalSize()}px` }}
      >
        {virtualItems.map((virtualItem) => {
          const item = items[virtualItem.index];
          if (item === undefined) return null;

          return (
            <div
              key={virtualItem.key}
              data-index={virtualItem.index}
              ref={virtualizer.measureElement}
              className="absolute left-0 top-0 w-full"
              style={{
                transform: `translateY(${virtualItem.start}px)`,
              }}
            >
              {renderItem(item, virtualItem.index)}
            </div>
          );
        })}
      </div>

      {/* Bottom loading indicator for infinite scroll */}
      {isLoading && items.length > 0 ? (
        <div className="flex items-center justify-center py-4">
          {loadingState ?? (
            <div className="flex items-center gap-2 text-text-secondary">
              <div className="h-4 w-4 animate-spin rounded-full border-2 border-accent-primary border-t-transparent" />
              <span className="text-xs">Loading more...</span>
            </div>
          )}
        </div>
      ) : null}
    </div>
  );
}
