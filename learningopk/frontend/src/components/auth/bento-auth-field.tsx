import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type BentoAuthFieldProps = {
  htmlFor: string;
  label: string;
  action?: ReactNode;
  error?: string | null;
  children: ReactNode;
  className?: string;
};

export function BentoAuthField({ htmlFor, label, action, error, children, className }: BentoAuthFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-bold tracking-[-0.02em] text-[#1b2d4c] sm:text-base">
          {label}
        </label>
        {action}
      </div>
      {children}
      {error ? <p className="text-sm text-rose-700">{error}</p> : null}
    </div>
  );
}
