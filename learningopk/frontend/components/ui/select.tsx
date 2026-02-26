import { forwardRef, type SelectHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement>;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select({ className, ...props }, ref) {
  return (
    <select
      ref={ref}
      className={cn(
        "h-10 w-full rounded-lg border border-input bg-card px-3 text-sm text-foreground shadow-sm focus:border-primary/55",
        className
      )}
      {...props}
    />
  );
});

