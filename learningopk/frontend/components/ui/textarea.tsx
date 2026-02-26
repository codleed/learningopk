import { forwardRef, type TextareaHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement>;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea({ className, ...props }, ref) {
  return (
    <textarea
      ref={ref}
      className={cn(
        "min-h-24 w-full rounded-lg border border-input bg-card px-3 py-2.5 text-sm text-foreground shadow-sm placeholder:text-muted-foreground focus:border-primary/55",
        className
      )}
      {...props}
    />
  );
});

