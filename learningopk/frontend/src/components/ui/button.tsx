"use client";

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

/* ─── Spinner used inside the button during loading state ─── */
function ButtonSpinner({ className }: { className?: string }) {
  return (
    <svg
      className={cn("animate-spin", className)}
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
      <path
        className="opacity-75"
        fill="currentColor"
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
      />
    </svg>
  );
}

/* ─── CVA Variants ─── */
export const buttonVariants = cva(
  [
    "relative inline-flex items-center justify-center gap-2 font-medium",
    "transition-all duration-150 ease-out",
    "disabled:pointer-events-none disabled:opacity-50",
    "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent/50 focus-visible:ring-offset-2",
  ].join(" "),
  {
    variants: {
      variant: {
        primary: [
          "bg-accent text-on-accent hover:bg-accent-bright shadow-[var(--shadow-sm)] active:scale-[0.98]",
        ].join(" "),
        secondary: [
          "bg-bg-surface text-text-primary border border-border-strong hover:bg-bg-elevated active:scale-[0.98]",
        ].join(" "),
        ghost: ["text-text-secondary hover:bg-accent-tint hover:text-text-primary"].join(" "),
        danger: ["bg-danger text-white hover:opacity-90 active:scale-[0.98]"].join(" "),
        success: ["bg-accent text-on-accent hover:bg-accent-bright active:scale-[0.98]"].join(" "),
        outline: [
          "border border-border-strong text-text-primary bg-transparent hover:bg-bg-elevated",
        ].join(" "),
      },
      size: {
        xs: "h-7 px-2.5 text-xs rounded-[6px]",
        sm: "h-8 px-3 text-xs rounded-[8px]",
        md: "h-10 px-4 text-sm rounded-[8px]",
        lg: "h-12 px-6 text-base rounded-[8px]",
        xl: "h-14 px-8 text-lg rounded-[8px]",
      },
      shape: {
        default: "",
        square: "!px-0",
        pill: "!rounded-full",
      },
      width: {
        auto: "",
        full: "w-full",
      },
    },
    compoundVariants: [
      { shape: "square", size: "xs", className: "w-7" },
      { shape: "square", size: "sm", className: "w-8" },
      { shape: "square", size: "md", className: "w-10" },
      { shape: "square", size: "lg", className: "w-12" },
      { shape: "square", size: "xl", className: "w-14" },
    ],
    defaultVariants: {
      variant: "primary",
      size: "md",
      shape: "default",
      width: "auto",
    },
  }
);

/** Props for the Button component. */
export interface ButtonProps
  extends
    Omit<ButtonHTMLAttributes<HTMLButtonElement>, "children">,
    VariantProps<typeof buttonVariants> {
  /** Content rendered inside the button. */
  children?: ReactNode;
  /** Show a loading spinner and disable interaction. */
  loading?: boolean;
  /** Icon element rendered before the label. */
  iconLeft?: ReactNode;
  /** Icon element rendered after the label. */
  iconRight?: ReactNode;
  /** Disable the press scale animation. */
  disableAnimation?: boolean;
}

/**
 * Accessible button primitive with CVA variants.
 *
 * Supports loading state, icon slots, and an optional press state.
 */
export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  {
    className,
    variant,
    size,
    shape,
    width,
    loading = false,
    iconLeft,
    iconRight,
    disabled,
    children,
    type = "button",
    disableAnimation = false,
    ...props
  },
  ref
) {
  const isDisabled = disabled || loading;

  const iconSizeClass =
    size === "xs" || size === "sm"
      ? "h-3.5 w-3.5"
      : size === "lg" || size === "xl"
        ? "h-5 w-5"
        : "h-4 w-4";

  const content = (
    <>
      {loading ? (
        <ButtonSpinner className={iconSizeClass} />
      ) : iconLeft ? (
        <span className={cn("shrink-0", iconSizeClass, "[&>svg]:h-full [&>svg]:w-full")}>
          {iconLeft}
        </span>
      ) : null}

      {children ? (
        <span className={cn(loading && "opacity-0 select-none", "truncate")}>{children}</span>
      ) : null}

      {!loading && iconRight ? (
        <span className={cn("shrink-0", iconSizeClass, "[&>svg]:h-full [&>svg]:w-full")}>
          {iconRight}
        </span>
      ) : null}
    </>
  );

  return (
    <button
      ref={ref}
      type={type}
      disabled={isDisabled}
      className={cn(
        buttonVariants({ variant, size, shape, width }),
        disableAnimation && "active:scale-100",
        className
      )}
      aria-busy={loading || undefined}
      {...props}
    >
      {content}
    </button>
  );
});

export type { VariantProps };
