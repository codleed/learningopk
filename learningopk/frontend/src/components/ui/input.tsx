"use client";

import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── CVA Input Variants ─── */
const inputVariants = cva(
  [
    "w-full text-ink placeholder:text-ink-faint",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus-visible:outline-none",
    "font-[var(--font-body)]",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-paper-dim border border-hairline-strong rounded-[8px]",
          "focus-visible:border-accent focus-visible:ring-2 focus-visible:ring-accent/40",
        ].join(" "),
        ghost: [
          "bg-transparent border-none rounded-[8px]",
          "focus-visible:ring-2 focus-visible:ring-accent/40",
        ].join(" "),
      },
      inputSize: {
        sm: "h-8 px-3 text-xs",
        md: "h-10 px-3.5 text-sm",
        lg: "h-12 px-4 text-base",
      },
    },
    defaultVariants: {
      variant: "default",
      inputSize: "md",
    },
  }
);

/** Props for the Input component. */
export interface InputProps
  extends
    Omit<InputHTMLAttributes<HTMLInputElement>, "size" | "prefix">,
    VariantProps<typeof inputVariants> {
  /** Error message to display below the input. Also triggers danger ring styling. */
  error?: string | null;
  /** Icon or element rendered before the input value. */
  prefix?: ReactNode;
  /** Icon or element rendered after the input value. */
  suffix?: ReactNode;
  /** Accessible label — renders a visible label element above the input. */
  label?: string;
}

/**
 * Form input primitive with icon slots, error state, and variant support.
 *
 * Uses `forwardRef` for integration with form libraries.
 */
export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { className, variant, inputSize, error, prefix, suffix, label, id, disabled, ...props },
  ref
) {
  const inputId = id ?? props.name;
  const errorStr = error ?? undefined;
  const hasError = Boolean(errorStr);

  const errorClasses = hasError
    ? "!border-accent-danger !ring-2 !ring-accent-danger/20 focus:!border-accent-danger focus:!ring-accent-danger/20"
    : "";

  const inputElement = (
    <input
      ref={ref}
      id={inputId}
      disabled={disabled}
      aria-invalid={hasError || undefined}
      aria-describedby={hasError && inputId ? `${inputId}-error` : undefined}
      className={cn(
        inputVariants({ variant, inputSize }),
        prefix && "pl-10",
        suffix && "pr-10",
        errorClasses,
        className
      )}
      {...props}
    />
  );

  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={inputId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}

      <div className="relative">
        {prefix ? (
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-3 text-text-muted [&>svg]:h-4 [&>svg]:w-4">
            {prefix}
          </span>
        ) : null}

        {inputElement}

        {suffix ? (
          <span className="pointer-events-none absolute inset-y-0 right-0 flex items-center pr-3 text-text-muted [&>svg]:h-4 [&>svg]:w-4">
            {suffix}
          </span>
        ) : null}
      </div>

      {hasError && inputId ? (
        <p id={`${inputId}-error`} className="text-xs text-accent-danger" role="alert">
          {errorStr}
        </p>
      ) : null}
    </div>
  );
});
