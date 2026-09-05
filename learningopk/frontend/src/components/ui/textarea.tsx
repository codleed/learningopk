"use client";

import {
  forwardRef,
  useCallback,
  useEffect,
  useRef,
  type TextareaHTMLAttributes,
  type ReactNode,
} from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── CVA Textarea Variants ─── */
const textareaVariants = cva(
  [
    "w-full text-text-primary placeholder:text-text-muted",
    "transition-all duration-150 ease-out",
    "disabled:cursor-not-allowed disabled:opacity-50",
    "focus:outline-none",
    "font-[var(--font-body)]",
    "resize-none",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-bg-surface border border-border-default rounded-lg",
          "shadow-[var(--shadow-sm)]",
          "focus:border-accent-primary focus:ring-2 focus:ring-accent-primary/20",
        ].join(" "),
        ghost: [
          "bg-transparent border-none rounded-lg",
          "focus:bg-bg-subtle focus:ring-2 focus:ring-accent-primary/20",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Props for the Textarea component. */
export interface TextareaProps
  extends
    Omit<TextareaHTMLAttributes<HTMLTextAreaElement>, "children">,
    VariantProps<typeof textareaVariants> {
  /** Error message displayed below the textarea. */
  error?: string;
  /** Accessible label rendered above the textarea. */
  label?: string;
  /** Enable auto-resize to content height. */
  autoResize?: boolean;
  /** Show a character count indicator. Requires `maxLength` prop. */
  showCount?: boolean;
  /** Maximum number of visible rows before scrolling (only with autoResize). */
  maxRows?: number;
}

/**
 * Form textarea primitive with auto-resize, character count, and error state.
 *
 * Uses `forwardRef` for integration with form libraries.
 */
export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  {
    className,
    variant,
    error,
    label,
    autoResize = false,
    showCount = false,
    maxRows,
    maxLength,
    id,
    rows = 3,
    onChange,
    value,
    defaultValue,
    ...props
  },
  forwardedRef
) {
  const internalRef = useRef<HTMLTextAreaElement | null>(null);
  const textareaId = id ?? props.name;
  const hasError = Boolean(error);

  /* Merge refs */
  const setRefs = useCallback(
    (el: HTMLTextAreaElement | null) => {
      internalRef.current = el;
      if (typeof forwardedRef === "function") {
        forwardedRef(el);
      } else if (forwardedRef) {
        (forwardedRef as React.MutableRefObject<HTMLTextAreaElement | null>).current = el;
      }
    },
    [forwardedRef]
  );

  /* Auto-resize logic */
  const resizeTextarea = useCallback(() => {
    const el = internalRef.current;
    if (!el || !autoResize) return;

    el.style.height = "auto";
    let newHeight = el.scrollHeight;

    if (maxRows) {
      const lineHeight = parseInt(getComputedStyle(el).lineHeight) || 20;
      const maxHeight = lineHeight * maxRows;
      newHeight = Math.min(newHeight, maxHeight);
    }

    el.style.height = `${newHeight}px`;
  }, [autoResize, maxRows]);

  useEffect(() => {
    resizeTextarea();
  }, [value, defaultValue, resizeTextarea]);

  const handleChange = useCallback(
    (e: React.ChangeEvent<HTMLTextAreaElement>) => {
      onChange?.(e);
      resizeTextarea();
    },
    [onChange, resizeTextarea]
  );

  const currentLength = typeof value === "string" ? value.length : 0;

  const errorClasses = hasError
    ? "!border-accent-danger !ring-2 !ring-accent-danger/20 focus:!border-accent-danger focus:!ring-accent-danger/20"
    : "";

  return (
    <div className="w-full space-y-1.5">
      {label ? (
        <label htmlFor={textareaId} className="block text-sm font-medium text-text-primary">
          {label}
        </label>
      ) : null}

      <textarea
        ref={setRefs}
        id={textareaId}
        rows={rows}
        maxLength={maxLength}
        value={value}
        defaultValue={defaultValue}
        onChange={handleChange}
        aria-invalid={hasError || undefined}
        aria-describedby={hasError && textareaId ? `${textareaId}-error` : undefined}
        className={cn(
          textareaVariants({ variant }),
          "min-h-[80px] px-3.5 py-2.5 text-sm",
          autoResize && "overflow-hidden",
          errorClasses,
          className
        )}
        {...props}
      />

      <div className="flex items-center justify-between">
        {hasError && textareaId ? (
          <p id={`${textareaId}-error`} className="text-xs text-accent-danger" role="alert">
            {error}
          </p>
        ) : (
          <span />
        )}

        {showCount && maxLength ? (
          <span
            className={cn(
              "text-xs tabular-nums",
              currentLength >= maxLength ? "text-accent-danger" : "text-text-muted"
            )}
          >
            {currentLength}/{maxLength}
          </span>
        ) : null}
      </div>
    </div>
  );
});
