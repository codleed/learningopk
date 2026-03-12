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
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between">
        <label
          htmlFor={htmlFor}
          className="text-sm font-medium text-slate-700"
        >
          {label}
        </label>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
      {error ? (
        <p className="text-xs font-medium text-red-500">{error}</p>
      ) : null}
    </div>
  );
}
