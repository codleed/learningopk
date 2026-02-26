import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 rounded-lg text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-55",
  {
    variants: {
      variant: {
        primary:
          "bg-primary px-4 py-2.5 text-primary-foreground shadow-[var(--elevation-soft)] hover:bg-primary/92",
        secondary:
          "border border-border bg-card px-4 py-2.5 text-foreground hover:border-primary/40 hover:bg-accent/50",
        ghost: "px-3 py-2 text-foreground hover:bg-accent/55",
        danger:
          "bg-destructive px-4 py-2.5 text-white shadow-[var(--elevation-soft)] hover:bg-destructive/92"
      },
      size: {
        sm: "h-8 rounded-md px-3 text-xs",
        md: "h-10 px-4",
        lg: "h-11 px-5 text-base"
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

