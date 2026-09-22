import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── CVA Card Variants ─── */
const cardVariants = cva(["text-ink"].join(" "), {
  variants: {
    variant: {
      default: [
        "bg-paper-dim border border-hairline rounded-[12px] shadow-[var(--shadow-sm)] hover:border-hairline-strong",
      ].join(" "),
      elevated: [
        "bg-paper-dim border border-hairline rounded-[12px] shadow-[var(--shadow-md)]",
      ].join(" "),
      bordered: [
        "bg-paper-dim border border-hairline-strong rounded-[12px] shadow-[var(--shadow-sm)]",
      ].join(" "),
      gradient: [
        "bg-paper-dim border border-hairline rounded-[12px] shadow-[var(--shadow-sm)]",
      ].join(" "),
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

/** Props for the Card component. */
export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

/**
 * Card container with multiple visual variants.
 *
 * The `gradient` variant is kept for call-site compatibility and renders like `default`.
 */
export function Card({ className, variant, children, style, ...props }: CardProps) {
  return (
    <div className={cn(cardVariants({ variant }), className)} style={style} {...props}>
      {children}
    </div>
  );
}

/** Props for the CardHeader sub-component. */
export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

/**
 * Header section of a Card. Renders a flex column with bottom border.
 */
export function CardHeader({ className, ...props }: CardHeaderProps) {
  return <div className={cn("flex flex-col gap-1.5 p-5 pb-4", className)} {...props} />;
}

/** Props for the CardBody sub-component. */
export type CardBodyProps = HTMLAttributes<HTMLDivElement>;

/**
 * Body/content section of a Card.
 */
export function CardBody({ className, ...props }: CardBodyProps) {
  return <div className={cn("px-5 py-4", className)} {...props} />;
}

/** Props for the CardFooter sub-component. */
export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

/**
 * Footer section of a Card. Renders a flex row with top border.
 */
export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn("flex items-center gap-2 border-t border-hairline px-5 py-4", className)}
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
  return <p className={cn("text-sm text-ink-soft", className)} {...props} />;
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
  return <div className={cn("flex items-center gap-2", className)} {...props} />;
}
