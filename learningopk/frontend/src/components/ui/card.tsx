import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes, ReactNode } from "react";

import { cn } from "@/lib/utils";

const cardStyles = cva(
  "rounded-lg border bg-card text-card-foreground shadow-sm transition-shadow duration-200",
  {
    variants: {
      variant: {
        default: "border-border",
        elevated: "border-transparent shadow-md hover:shadow-lg",
        outlined: "border-2 border-border bg-transparent",
        ghost: "border-transparent bg-transparent shadow-none"
      },
      padding: {
        none: "p-0",
        sm: "p-3",
        default: "p-4",
        lg: "p-6"
      }
    },
    defaultVariants: {
      variant: "default",
      padding: "default"
    }
  }
);

export type CardProps = HTMLAttributes<HTMLDivElement> & VariantProps<typeof cardStyles>;

export function Card({ className, variant, padding, ...props }: CardProps) {
  return <div className={cn(cardStyles({ variant, padding }), className)} {...props} />;
}

export type CardHeaderProps = HTMLAttributes<HTMLDivElement>;

export function CardHeader({ className, ...props }: CardHeaderProps) {
  return (
    <div
      className={cn("flex flex-col space-y-1.5 pb-3 border-b border-border", className)}
      {...props}
    />
  );
}

export type CardTitleProps = HTMLAttributes<HTMLHeadingElement>;

export function CardTitle({ className, ...props }: CardTitleProps) {
  return (
    <h3
      className={cn("text-xl font-semibold leading-none tracking-tight font-heading", className)}
      {...props}
    />
  );
}

export type CardDescriptionProps = HTMLAttributes<HTMLParagraphElement>;

export function CardDescription({ className, ...props }: CardDescriptionProps) {
  return (
    <p
      className={cn("text-sm text-muted-foreground", className)}
      {...props}
    />
  );
}

export type CardContentProps = HTMLAttributes<HTMLDivElement>;

export function CardContent({ className, ...props }: CardContentProps) {
  return <div className={cn("", className)} {...props} />;
}

export type CardFooterProps = HTMLAttributes<HTMLDivElement>;

export function CardFooter({ className, ...props }: CardFooterProps) {
  return (
    <div
      className={cn("flex items-center pt-3 mt-3 border-t border-border", className)}
      {...props}
    />
  );
}

export type CardActionsProps = HTMLAttributes<HTMLDivElement>;

export function CardActions({ className, ...props }: CardActionsProps) {
  return (
    <div
      className={cn("flex items-center gap-2", className)}
      {...props}
    />
  );
}
