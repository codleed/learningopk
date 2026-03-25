import type { ReactNode, HTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type AdminFormFieldProps = {
  label: string;
  error?: string;
  required?: boolean;
  children: ReactNode;
  hint?: string;
  id: string;
  className?: string;
} & HTMLAttributes<HTMLDivElement>;

export function AdminFormField({
  label,
  error,
  required,
  children,
  hint,
  id,
  className,
  ...props
}: AdminFormFieldProps) {
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={cn("flex flex-col gap-1.5", className)} {...props}>
      <label
        htmlFor={id}
        className="text-sm font-semibold text-[var(--foreground)]"
        style={{ fontSize: "0.875rem" }}
      >
        {label}
        {required && (
          <span className="ml-1 text-[var(--destructive)]" aria-hidden>
            *
          </span>
        )}
      </label>
      <div
        aria-describedby={error ? errorId : hint ? hintId : undefined}
        aria-invalid={error ? "true" : undefined}
      >
        {children}
      </div>
      {error && (
        <p id={errorId} className="text-[var(--destructive)]" style={{ fontSize: "0.75rem" }} role="alert">
          {error}
        </p>
      )}
      {hint && !error && (
        <p id={hintId} className="text-[var(--muted-foreground)]" style={{ fontSize: "0.75rem" }}>
          {hint}
        </p>
      )}
    </div>
  );
}
