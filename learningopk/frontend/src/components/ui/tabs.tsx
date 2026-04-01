"use client";

import { type HTMLAttributes, type ReactNode } from "react";
import { Tabs as TabsPrimitive } from "radix-ui";
import { motion } from "framer-motion";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Tab list style variants ─── */
const tabListVariants = cva("flex", {
  variants: {
    variant: {
      underline: "gap-0 border-b border-border-default",
      pills: "gap-1 rounded-lg bg-bg-subtle p-1",
      boxed: "gap-0 rounded-lg border border-border-default",
    },
  },
  defaultVariants: {
    variant: "underline",
  },
});

const tabTriggerBaseClasses = [
  "relative inline-flex items-center justify-center gap-2",
  "text-sm font-medium whitespace-nowrap",
  "transition-colors duration-150",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
  "disabled:pointer-events-none disabled:opacity-50",
].join(" ");

/* ═══════════════════════════════════════════
   Tabs Root
   ═══════════════════════════════════════════ */

/** Props for the Tabs component. */
export interface TabsProps extends Omit<HTMLAttributes<HTMLDivElement>, "defaultValue" | "dir"> {
  /** Default active tab value (uncontrolled). */
  defaultValue?: string;
  /** Controlled active tab value. */
  value?: string;
  /** Called when the active tab changes. */
  onValueChange?: (value: string) => void;
  /** Text direction. */
  dir?: "ltr" | "rtl";
  /** Tab content. */
  children: ReactNode;
}

/**
 * Accessible tab container built on Radix UI Tabs.
 *
 * Wrap TabList and TabContent inside this component.
 */
export function Tabs({
  className,
  defaultValue,
  value,
  onValueChange,
  dir,
  children,
  ...props
}: TabsProps) {
  return (
    <TabsPrimitive.Root
      defaultValue={defaultValue}
      value={value}
      onValueChange={onValueChange}
      dir={dir}
      className={cn("w-full", className)}
      {...props}
    >
      {children}
    </TabsPrimitive.Root>
  );
}

/* ═══════════════════════════════════════════
   TabList
   ═══════════════════════════════════════════ */

/** Props for the TabList component. */
export interface TabListProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof tabListVariants> {}

/**
 * Horizontal tab trigger list with visual variants.
 *
 * Variants: underline | pills | boxed.
 */
export function TabList({
  className,
  variant,
  ...props
}: TabListProps) {
  return (
    <TabsPrimitive.List
      className={cn(tabListVariants({ variant }), className)}
      {...props}
    />
  );
}

/* ═══════════════════════════════════════════
   TabTrigger
   ═══════════════════════════════════════════ */

/** Props for the TabTrigger component. */
export interface TabTriggerProps extends HTMLAttributes<HTMLButtonElement> {
  /** Value that links this trigger to its content panel. */
  value: string;
  /** Disabled state. */
  disabled?: boolean;
  /** Tab list variant (passed down to style the trigger). */
  variant?: "underline" | "pills" | "boxed";
  /** Unique layout ID for animated indicator. Defaults to "tab-indicator". */
  layoutId?: string;
}

/**
 * Individual tab trigger with Framer Motion animated indicator.
 *
 * The animated indicator uses `layoutId` for smooth transitions between tabs.
 */
export function TabTrigger({
  className,
  value,
  variant = "underline",
  layoutId = "tab-indicator",
  children,
  ...props
}: TabTriggerProps) {
  const variantClasses: Record<string, string> = {
    underline: cn(
      "px-4 py-2.5 -mb-px",
      "text-text-muted",
      "data-[state=active]:text-text-primary",
    ),
    pills: cn(
      "px-3 py-1.5 rounded-md",
      "text-text-muted",
      "data-[state=active]:text-text-primary",
    ),
    boxed: cn(
      "flex-1 px-4 py-2.5",
      "text-text-muted",
      "data-[state=active]:text-text-primary",
      "first:rounded-l-lg last:rounded-r-lg",
    ),
  };

  return (
    <TabsPrimitive.Trigger
      value={value}
      className={cn(
        tabTriggerBaseClasses,
        variantClasses[variant],
        className
      )}
      {...props}
    >
      {children}

      {/* Animated indicator — rendered via CSS for data-[state=active] */}
      <TabIndicator variant={variant} layoutId={`${layoutId}-${variant}`} />
    </TabsPrimitive.Trigger>
  );
}

/* ─── Internal animated indicator ─── */
function TabIndicator({
  variant,
  layoutId,
}: {
  variant: string;
  layoutId: string;
}) {
  if (variant === "underline") {
    return (
      <motion.span
        layoutId={layoutId}
        className="absolute bottom-0 left-0 right-0 h-0.5 rounded-full bg-accent-primary"
        transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
      />
    );
  }

  if (variant === "pills") {
    return (
      <motion.span
        layoutId={layoutId}
        className="absolute inset-0 rounded-md bg-bg-surface shadow-[var(--shadow-sm)] -z-10"
        transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
      />
    );
  }

  if (variant === "boxed") {
    return (
      <motion.span
        layoutId={layoutId}
        className="absolute inset-0 bg-bg-surface -z-10"
        transition={{ type: "spring" as const, stiffness: 400, damping: 30 }}
      />
    );
  }

  return null;
}

/* ═══════════════════════════════════════════
   TabContent
   ═══════════════════════════════════════════ */

/** Props for the TabContent component. */
export interface TabContentProps extends HTMLAttributes<HTMLDivElement> {
  /** Value that links this content panel to its trigger. */
  value: string;
  /** Force mount the content even when not active. */
  forceMount?: true;
}

/**
 * Tab content panel. Only renders when the matching trigger is active.
 */
export function TabContent({
  className,
  value,
  forceMount,
  ...props
}: TabContentProps) {
  return (
    <TabsPrimitive.Content
      value={value}
      forceMount={forceMount}
      className={cn(
        "mt-3 focus-visible:outline-none",
        "data-[state=inactive]:hidden",
        className
      )}
      {...props}
    />
  );
}
