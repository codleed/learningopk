import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

export interface FormFieldProps {
  label: ReactNode;
  htmlFor?: string;
  hint?: ReactNode;
  error?: ReactNode;
  required?: boolean;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}

export function FormField({ label, htmlFor, hint, error, required, action, children, className }: FormFieldProps) {
  const descriptionId = htmlFor ? `${htmlFor}-hint` : undefined;
  const errorId = htmlFor ? `${htmlFor}-error` : undefined;

  return (
    <div className={cn("space-y-1.5", className)}>
      <div className="flex items-center justify-between gap-3">
        <label htmlFor={htmlFor} className="text-sm font-medium text-text-primary">
          {label}{required ? <span className="ml-1 text-accent-danger" aria-hidden="true">*</span> : null}
          {required ? <span className="sr-only"> (required)</span> : null}
        </label>
        {action ? <div>{action}</div> : null}
      </div>
      {children}
      {error ? <p id={errorId} className="text-xs font-medium text-accent-danger" role="alert">{error}</p> : null}
      {!error && hint ? <p id={descriptionId} className="text-xs text-text-secondary">{hint}</p> : null}
    </div>
  );
}
