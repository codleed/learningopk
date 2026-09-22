"use client";

import {
  forwardRef,
  type AnchorHTMLAttributes,
  type ButtonHTMLAttributes,
  type ReactNode,
} from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   StampButton — replaces the rounded, shadowed Button.
   Primary = solid brick + caps label ("stamped"); secondary =
   ink outline; tertiary = underlined ink link.
   Press = scale 0.98.
   ═══════════════════════════════════════════════════════════════ */

export type StampVariant = "primary" | "secondary" | "tertiary" | "quiet" | "destructive";
export type StampSize = "sm" | "md" | "lg";

const baseStyles = [
  "inline-flex items-center justify-center gap-2 select-none rounded-[8px]",
  "transition-colors duration-[var(--press)]",
  "disabled:pointer-events-none disabled:opacity-45",
  "focus-visible:outline-2 focus-visible:outline-accent-bright focus-visible:outline-offset-2",
].join(" ");

const variantStyles: Record<StampVariant, string> = {
  primary:
    "bg-accent text-on-accent tracking-[0.08em] uppercase hover:bg-accent-bright active:scale-[0.98]",
  secondary:
    "bg-transparent border border-hairline-strong text-ink tracking-[0.08em] uppercase hover:border-accent hover:text-accent active:scale-[0.98]",
  tertiary:
    "bg-transparent text-ink underline decoration-hairline-strong underline-offset-4 hover:decoration-accent hover:text-accent",
  quiet: "bg-transparent text-ink-soft hover:text-ink hover:bg-accent-tint active:scale-[0.98]",
  destructive:
    "bg-transparent border border-danger text-danger tracking-[0.08em] uppercase hover:bg-danger-tint active:scale-[0.98]",
};

const sizeStyles: Record<StampSize, string> = {
  sm: "h-7 px-3 text-[0.6875rem] font-semibold",
  md: "h-9 px-4 text-xs font-semibold",
  lg: "h-11 px-6 text-sm font-semibold",
};

type CommonStampProps = {
  variant?: StampVariant;
  size?: StampSize;
  iconLeft?: ReactNode;
  iconRight?: ReactNode;
  fullWidth?: boolean;
  className?: string;
  children?: ReactNode;
};

export type StampButtonProps = CommonStampProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, "className" | "children">;

export const StampButton = forwardRef<HTMLButtonElement, StampButtonProps>(function StampButton(
  {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    fullWidth = false,
    className,
    children,
    type = "button",
    ...rest
  },
  ref
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {iconLeft ? (
        <span aria-hidden="true" className="shrink-0">
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span aria-hidden="true" className="shrink-0">
          {iconRight}
        </span>
      ) : null}
    </button>
  );
});

export type StampLinkProps = CommonStampProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "className" | "children">;

export const StampLink = forwardRef<HTMLAnchorElement, StampLinkProps>(function StampLink(
  {
    variant = "primary",
    size = "md",
    iconLeft,
    iconRight,
    fullWidth,
    className,
    children,
    ...rest
  },
  ref
) {
  return (
    <a
      ref={ref}
      className={cn(
        baseStyles,
        variantStyles[variant],
        sizeStyles[size],
        fullWidth && "w-full",
        className
      )}
      {...rest}
    >
      {iconLeft ? (
        <span aria-hidden="true" className="shrink-0">
          {iconLeft}
        </span>
      ) : null}
      {children}
      {iconRight ? (
        <span aria-hidden="true" className="shrink-0">
          {iconRight}
        </span>
      ) : null}
    </a>
  );
});
