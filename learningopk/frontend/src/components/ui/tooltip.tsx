"use client";

import { type ReactNode } from "react";
import { Tooltip as TooltipPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Props for the Tooltip component. */
export interface TooltipProps {
  /** Content rendered inside the tooltip popup. */
  content: ReactNode;
  /** The trigger element (child). */
  children: ReactNode;
  /** Side of the trigger to display the tooltip. */
  side?: "top" | "right" | "bottom" | "left";
  /** Alignment of the tooltip relative to the trigger. */
  align?: "start" | "center" | "end";
  /** Delay in ms before opening. Defaults to 400. */
  delayDuration?: number;
  /** Additional class applied to the tooltip content. */
  className?: string;
  /** Whether to render inside a portal. Defaults to true. */
  portal?: boolean;
}

/**
 * Accessible tooltip built on Radix UI Tooltip primitives.
 *
 * Defaults: 400ms open delay, 0ms close delay, with arrow pointer.
 */
export function Tooltip({
  content,
  children,
  side = "top",
  align = "center",
  delayDuration = 400,
  className,
  portal = true,
}: TooltipProps) {
  const tooltipContent = (
    <TooltipPrimitive.Content
      side={side}
      align={align}
      sideOffset={6}
      className={cn(
        "z-50 max-w-xs rounded-lg px-3 py-1.5",
        "bg-bg-elevated text-text-primary text-xs font-medium",
        "border border-border-default shadow-[var(--shadow-elevated)]",
        "animate-in fade-in-0 zoom-in-95",
        "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
        "data-[side=top]:slide-in-from-bottom-2",
        "data-[side=bottom]:slide-in-from-top-2",
        "data-[side=left]:slide-in-from-right-2",
        "data-[side=right]:slide-in-from-left-2",
        className
      )}
    >
      {content}
      <TooltipPrimitive.Arrow
        className="fill-bg-elevated"
        width={10}
        height={5}
      />
    </TooltipPrimitive.Content>
  );

  return (
    <TooltipPrimitive.Provider>
      <TooltipPrimitive.Root
        delayDuration={delayDuration}
        disableHoverableContent={false}
      >
        <TooltipPrimitive.Trigger asChild>
          {children}
        </TooltipPrimitive.Trigger>
        {portal ? (
          <TooltipPrimitive.Portal>
            {tooltipContent}
          </TooltipPrimitive.Portal>
        ) : (
          tooltipContent
        )}
      </TooltipPrimitive.Root>
    </TooltipPrimitive.Provider>
  );
}

/* ─── Re-export primitives for advanced usage ─── */
export const TooltipProvider = TooltipPrimitive.Provider;
export const TooltipRoot = TooltipPrimitive.Root;
export const TooltipTrigger = TooltipPrimitive.Trigger;
export const TooltipContent = TooltipPrimitive.Content;
export const TooltipArrow = TooltipPrimitive.Arrow;
