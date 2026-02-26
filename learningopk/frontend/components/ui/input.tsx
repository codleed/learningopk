import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type InputProps = InputHTMLAttributes<HTMLInputElement>;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input({ className, ...props }, ref) {
  return (
    <input
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary/55",
        className
      )}
      {...props}
    />
  );
});

