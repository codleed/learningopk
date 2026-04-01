"use client";

import { forwardRef, type ComponentPropsWithoutRef } from "react";
import { Switch as SwitchPrimitive } from "radix-ui";

import { cn } from "@/lib/utils";

/** Props for the Switch component. */
export interface SwitchProps
  extends Omit<ComponentPropsWithoutRef<typeof SwitchPrimitive.Root>, "children"> {
  /** Accessible label. */
  label?: string;
  /** Hint/description text below the label. */
  description?: string;
}

/**
 * Accessible toggle switch built on Radix UI Switch.
 *
 * Smooth sliding thumb with accent color when checked.
 */
export const Switch = forwardRef<
  HTMLButtonElement,
  SwitchProps
>(function Switch({ className, label, description, id, ...props }, ref) {
  const switchId = id ?? props.name;

  const switchElement = (
    <SwitchPrimitive.Root
      ref={ref}
      id={switchId}
      className={cn(
        "peer relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full",
        "border-2 border-transparent",
        "bg-bg-subtle",
        "transition-colors duration-200 ease-out",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        "disabled:cursor-not-allowed disabled:opacity-50",
        "data-[state=checked]:bg-accent-primary",
        className
      )}
      {...props}
    >
      <SwitchPrimitive.Thumb
        className={cn(
          "pointer-events-none block h-5 w-5 rounded-full bg-white shadow-sm",
          "ring-0",
          "transition-transform duration-200 ease-out",
          "data-[state=unchecked]:translate-x-0",
          "data-[state=checked]:translate-x-5"
        )}
      />
    </SwitchPrimitive.Root>
  );

  if (label || description) {
    return (
      <div className="flex items-start gap-3">
        {switchElement}
        <label htmlFor={switchId} className="cursor-pointer select-none">
          {label ? (
            <span className="block text-sm font-medium text-text-primary">
              {label}
            </span>
          ) : null}
          {description ? (
            <span className="block text-xs text-text-muted mt-0.5">
              {description}
            </span>
          ) : null}
        </label>
      </div>
    );
  }

  return switchElement;
});
