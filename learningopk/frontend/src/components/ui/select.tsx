"use client";

import { forwardRef, type SelectHTMLAttributes, type ReactNode } from "react";
import { Select as SelectPrimitive } from "radix-ui";
import { Check, ChevronDown, ChevronUp } from "lucide-react";

import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════
   Select — Native <select> (backward-compatible)
   ═══════════════════════════════════════════ */

/** Props for the native Select element. */
export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

/**
 * Native HTML select element with project styling.
 *
 * This is the default `Select` export for backward compatibility with
 * existing consumer code that uses `onChange`, `id`, `<option>` children, etc.
 *
 * For new code that needs Radix-powered dropdowns, use `RadixSelect`.
 */
export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { className, ...props },
  ref
) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-12 w-full rounded-lg border border-border-default bg-bg-surface px-4 text-base text-text-primary shadow-[var(--shadow-sm)] focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary/20 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  );
});

/** @deprecated Use `Select` instead. Alias kept for explicit references. */
export const NativeSelect = Select;
/** @deprecated Use `SelectProps` instead. */
export type NativeSelectProps = SelectProps;

/* ═══════════════════════════════════════════
   RadixSelect — Radix UI accessible select
   ═══════════════════════════════════════════ */

/** Props for the Radix-based RadixSelect component. */
export interface RadixSelectProps {
  /** Controlled value. */
  value?: string;
  /** Default (uncontrolled) value. */
  defaultValue?: string;
  /** Called when the value changes. */
  onValueChange?: (value: string) => void;
  /** Placeholder text shown when no value is selected. */
  placeholder?: string;
  /** Whether the select is disabled. */
  disabled?: boolean;
  /** Children: SelectItem or SelectGroup elements. */
  children: ReactNode;
  /** Additional class applied to the trigger. */
  className?: string;
  /** Accessible label for the select. */
  label?: string;
  /** Error message displayed below the trigger. */
  error?: string;
  /** Name attribute for form usage. */
  name?: string;
}

/**
 * Accessible select dropdown built on Radix UI Select primitives.
 *
 * Supports option groups, icons, descriptions, and error state.
 */
export function RadixSelect({
  value,
  defaultValue,
  onValueChange,
  placeholder = "Select an option\u2026",
  disabled = false,
  children,
  className,
  label,
  error,
  name,
}: RadixSelectProps) {
  const hasError = Boolean(error);

  return (
    <div className="w-full space-y-1.5">
      {label ? <span className="block text-sm font-medium text-text-primary">{label}</span> : null}

      <SelectPrimitive.Root
        value={value}
        defaultValue={defaultValue}
        onValueChange={onValueChange}
        disabled={disabled}
        name={name}
      >
        <SelectPrimitive.Trigger
          className={cn(
            "flex h-10 w-full items-center justify-between rounded-lg px-3.5 text-sm",
            "bg-bg-surface border border-border-default text-text-primary",
            "shadow-[var(--shadow-sm)]",
            "placeholder:text-text-muted",
            "transition-all duration-150 ease-out",
            "focus:outline-none focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
            "disabled:cursor-not-allowed disabled:opacity-50",
            hasError && "!border-accent-danger !ring-2 !ring-accent-danger/20",
            className
          )}
          aria-invalid={hasError || undefined}
        >
          <SelectPrimitive.Value placeholder={placeholder} />
          <SelectPrimitive.Icon className="ml-2 text-text-muted">
            <ChevronDown className="h-4 w-4" />
          </SelectPrimitive.Icon>
        </SelectPrimitive.Trigger>

        <SelectPrimitive.Portal>
          <SelectPrimitive.Content
            className={cn(
              "z-50 overflow-hidden rounded-lg",
              "bg-bg-elevated border border-border-default",
              "shadow-[var(--shadow-elevated)]",
              "animate-in fade-in-0 zoom-in-95",
              "data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95",
              "data-[side=top]:slide-in-from-bottom-2",
              "data-[side=bottom]:slide-in-from-top-2"
            )}
            position="popper"
            sideOffset={4}
          >
            <SelectPrimitive.ScrollUpButton className="flex h-6 cursor-default items-center justify-center bg-bg-elevated text-text-muted">
              <ChevronUp className="h-4 w-4" />
            </SelectPrimitive.ScrollUpButton>

            <SelectPrimitive.Viewport className="p-1 max-h-[min(var(--radix-select-content-available-height),320px)]">
              {children}
            </SelectPrimitive.Viewport>

            <SelectPrimitive.ScrollDownButton className="flex h-6 cursor-default items-center justify-center bg-bg-elevated text-text-muted">
              <ChevronDown className="h-4 w-4" />
            </SelectPrimitive.ScrollDownButton>
          </SelectPrimitive.Content>
        </SelectPrimitive.Portal>
      </SelectPrimitive.Root>

      {hasError ? (
        <p className="text-xs text-accent-danger" role="alert">
          {error}
        </p>
      ) : null}
    </div>
  );
}

/* ═══════════════════════════════════════════
   SelectItem (for RadixSelect)
   ═══════════════════════════════════════════ */

/** Props for the SelectItem component. */
export interface SelectItemProps {
  /** Value of this option. */
  value: string;
  /** Display label. If not provided, children are used. */
  children: ReactNode;
  /** Optional icon rendered before the label. */
  icon?: ReactNode;
  /** Optional description rendered below the label. */
  description?: string;
  /** Whether this item is disabled. */
  disabled?: boolean;
  /** Additional class. */
  className?: string;
}

/**
 * Individual option inside a RadixSelect. Supports icon and description.
 */
export function SelectItem({
  value,
  children,
  icon,
  description,
  disabled,
  className,
}: SelectItemProps) {
  return (
    <SelectPrimitive.Item
      value={value}
      disabled={disabled}
      className={cn(
        "relative flex cursor-pointer select-none items-center rounded-md px-2 py-1.5 pl-8 text-sm",
        "text-text-primary",
        "outline-none",
        "data-[highlighted]:bg-bg-subtle data-[highlighted]:text-text-primary",
        "data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
        className
      )}
    >
      <SelectPrimitive.ItemIndicator className="absolute left-2 flex items-center justify-center">
        <Check className="h-3.5 w-3.5 text-accent-primary" />
      </SelectPrimitive.ItemIndicator>

      <div className="flex items-center gap-2">
        {icon ? (
          <span className="shrink-0 text-text-muted [&>svg]:h-4 [&>svg]:w-4">{icon}</span>
        ) : null}
        <div>
          <SelectPrimitive.ItemText>{children}</SelectPrimitive.ItemText>
          {description ? <p className="text-xs text-text-muted mt-0.5">{description}</p> : null}
        </div>
      </div>
    </SelectPrimitive.Item>
  );
}

/* ═══════════════════════════════════════════
   SelectGroup (for RadixSelect)
   ═══════════════════════════════════════════ */

/** Props for the SelectGroup component. */
export interface SelectGroupProps {
  /** Group label displayed above the items. */
  label: string;
  /** SelectItem children. */
  children: ReactNode;
}

/**
 * Group container for related SelectItem elements.
 */
export function SelectGroup({ label, children }: SelectGroupProps) {
  return (
    <SelectPrimitive.Group>
      <SelectPrimitive.Label className="px-2 py-1.5 text-xs font-semibold text-text-muted uppercase tracking-wider">
        {label}
      </SelectPrimitive.Label>
      {children}
    </SelectPrimitive.Group>
  );
}

/** Visual separator between groups. */
export function SelectSeparator({ className }: { className?: string }) {
  return <SelectPrimitive.Separator className={cn("my-1 h-px bg-border-default", className)} />;
}
