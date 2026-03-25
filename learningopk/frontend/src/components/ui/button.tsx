import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2",
  {
    variants: {
      variant: {
        primary:
          "bg-[var(--primary)] text-[var(--primary-foreground)] hover:bg-[var(--primary-hover)] shadow-sm",
        secondary:
          "border border-border bg-card text-foreground hover:border-[var(--primary)]/40 hover:bg-accent/50",
        ghost: "text-foreground hover:bg-accent/55",
        danger:
          "bg-destructive text-destructive-foreground hover:bg-destructive/90 shadow-sm"
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-12 px-6 text-base"
      },
      width: {
        auto: "w-auto",
        full: "w-full"
      }
    },
    defaultVariants: {
      variant: "primary",
      size: "md",
      width: "auto"
    }
  }
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, width, type = "button", ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size, width }), className)} {...props} />;
}
