import type { HTMLAttributes } from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const surfaceVariants = cva(
  "rounded-lg border border-border-default bg-bg-surface shadow-[var(--shadow-card)]",
  {
    variants: {
      padding: {
        none: "p-0",
        sm: "p-3",
        md: "p-5",
        lg: "p-6",
      },
    },
    defaultVariants: { padding: "md" },
  }
);

export interface SurfaceProps extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof surfaceVariants> {}

export function Surface({ className, padding, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ padding }), className)} {...props} />;
}
