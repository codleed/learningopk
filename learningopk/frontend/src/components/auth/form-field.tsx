"use client";

import { ReactNode } from "react";

import { cn } from "@/lib/utils";

type FormFieldProps = {
  htmlFor?: string;
  label: string;
  error?: string | null;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
};

export function FormField({
  htmlFor,
  label,
  error,
  action,
  children,
  className,
}: FormFieldProps) {
  return (
    <div className={cn("space-y-2", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-foreground"
        >
          {label}
        </label>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-destructive">{error}</p>
      ) : null}
    </div>
  );
}
