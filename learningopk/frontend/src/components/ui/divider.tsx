import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/** Props for the Divider component. */
export interface DividerProps extends HTMLAttributes<HTMLDivElement> {
  /** Orientation of the divider. */
  orientation?: "horizontal" | "vertical";
  /** Optional label rendered in the center of the divider. */
  label?: string;
}

/**
 * Visual separator with optional centered label.
 *
 * Supports horizontal and vertical orientations.
 */
export function Divider({ className, orientation = "horizontal", label, ...props }: DividerProps) {
  if (orientation === "vertical") {
    return (
      <div
        className={cn("inline-block h-full w-px self-stretch bg-border-default", className)}
        role="separator"
        aria-orientation="vertical"
        {...props}
      />
    );
  }

  if (label) {
    return (
      <div
        className={cn("flex items-center gap-3", className)}
        role="separator"
        aria-orientation="horizontal"
        {...props}
      >
        <span className="h-px flex-1 bg-border-default" />
        <span className="shrink-0 text-xs font-medium text-text-muted select-none">{label}</span>
        <span className="h-px flex-1 bg-border-default" />
      </div>
    );
  }

  return (
    <div
      className={cn("h-px w-full bg-border-default", className)}
      role="separator"
      aria-orientation="horizontal"
      {...props}
    />
  );
}
