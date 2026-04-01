import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── CVA Card Variants ─── */
const cardVariants = cva(
  [
    "rounded-xl text-text-primary",
    "transition-all duration-200 ease-out",
  ].join(" "),
  {
    variants: {
      variant: {
        default: [
          "bg-bg-surface border border-border-default",
          "shadow-[var(--shadow-sm)]",
          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        ].join(" "),
        elevated: [
          "bg-bg-surface border border-border-default",
          "shadow-[var(--shadow-card)]",
          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-elevated)]",
        ].join(" "),
        bordered: [
          "bg-bg-surface border-2 border-border-strong",
          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        ].join(" "),
        gradient: [
          "relative bg-bg-surface",
          "hover:-translate-y-0.5 hover:shadow-[var(--shadow-card)]",
        ].join(" "),
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

/** Props for the Card component. */
export interface CardProps
  extends HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof cardVariants> {}

/**
 * Card container with multiple visual variants.
 *
 * The `gradient` variant renders a 1px conic-gradient border using `var(--card-gradient)`.
 */
export function Card({ className, variant, children, style, ...props }: CardProps) {
  if (variant === "gradient") {
    return (
      <div
        className={cn("relative rounded-xl p-px", className)}
        style={{
          background: "var(--card-gradient)",
          ...style,
        }}
        {...props}
      >
        <div
          className={cn(
            cardVariants({ variant }),
            "rounded-[11px] h-full"
          )}
        >
          {children}
        </div>
      </div>
    );
  }

  return (
    <div
      className={cn(cardVariants({ variant }), className)}
      style={style}
      {...props}
    >
      {children}
    </div>
  );
}

/** Props for the CardHeader sub-component. */
export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Header section of a Card. Renders a flex column with bottom border.
 */
export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-1.5 p-5 pb-4",
        className
      )}
      {...props}
    />
  );
}

/** Props for the CardBody sub-component. */
export interface CardBodyProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Body/content section of a Card.
 */
export function CardBody({ className, ...props }: CardBodyProps) {
  return (
    <div
      className={cn("px-5 py-4", className)}
      {...props}
    />
  );
}

/** Props for the CardFooter sub-component. */
export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {}

/**
 * Footer section of a Card. Renders a flex row with top border.
 */
export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn(
        "flex items-center gap-2 border-t border-border-default px-5 py-4",
        className
      )}
      {...props}
    />
  );
}

/* ─── Legacy sub-components kept for backward-compat ─── */

/** @deprecated Use CardHeader instead */
export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

/** @deprecated Use within CardHeader */
export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn(
        "text-lg font-semibold leading-none tracking-tight font-[var(--font-display)]",
        className
      )}
      {...props}
    />
  );
}

/** @deprecated Use CardBody instead */
export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

/** @deprecated Use within CardHeader */
export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-text-secondary", className)}
      {...props}
    />
  );
}

/** @deprecated Use CardBody instead */
export type CardContentProps = HTMLAttributes<HTMLDivElement>;

/** @deprecated Alias for CardBody. */
export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("", className)} {...props} />;
}

/** @deprecated Use CardFooter instead */
export type CardActionsProps = HTMLAttributes<HTMLDivElement>;

/** @deprecated Alias for flex row actions. */
export function CardActions({ className, ...props }: CardActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}
