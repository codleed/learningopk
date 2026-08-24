import { cva, type VariantProps } from "class-variance-authority";
import type { HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

/* ─── Size variants ─── */
const spinnerSizeVariants = cva("", {
  variants: {
    size: {
      sm: "h-4 w-4",
      md: "h-6 w-6",
      lg: "h-10 w-10",
    },
  },
  defaultVariants: {
    size: "md",
  },
});

/** Props for the Spinner component. */
export interface SpinnerProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof spinnerSizeVariants> {
  /** Visual style: "border" (CSS ring) or "dots" (animated dots). */
  variant?: "border" | "dots";
  /** Accessible label. Defaults to "Loading". */
  label?: string;
}

/**
 * Loading spinner with border or animated dots variant.
 *
 * Both variants respect reduced-motion preferences via CSS.
 */
export function Spinner({
  className,
  size = "md",
  variant = "border",
  label = "Loading",
  ...props
}: SpinnerProps) {
  if (variant === "dots") {
    const dotSize = size === "sm" ? "h-1.5 w-1.5" : size === "lg" ? "h-3 w-3" : "h-2 w-2";
    const gap = size === "sm" ? "gap-1" : size === "lg" ? "gap-2" : "gap-1.5";

    return (
      <div
        className={cn("inline-flex items-center", gap, className)}
        role="status"
        aria-label={label}
        {...props}
      >
        {[0, 1, 2].map((i) => (
          <span
            key={i}
            className={cn("rounded-full bg-accent-primary", dotSize)}
            style={{
              animation: "streaming-dot 1.4s ease-in-out infinite",
              animationDelay: `${i * 0.2}s`,
            }}
            aria-hidden="true"
          />
        ))}
        <span className="sr-only">{label}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "inline-block animate-spin rounded-full",
        "border-2 border-current border-t-transparent",
        "text-accent-primary",
        spinnerSizeVariants({ size }),
        className
      )}
      role="status"
      aria-label={label}
      {...props}
    >
      <span className="sr-only">{label}</span>
    </div>
  );
}
