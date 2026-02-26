import { forwardRef, type InputHTMLAttributes } from "react";

import { cn } from "@/lib/utils";

type CheckboxProps = Omit<InputHTMLAttributes<HTMLInputElement>, "type"> & {
  label?: string;
  hint?: string;
};

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { className, label, hint, id, ...props },
  ref
) {
  const inputId = id ?? props.name;

  return (
    <label htmlFor={inputId} className="flex items-start gap-2.5">
      <input
        id={inputId}
        ref={ref}
        type="checkbox"
        className={cn(
          "mt-0.5 h-4 w-4 rounded border border-input text-primary focus:ring-primary/35",
          className
        )}
        {...props}
      />
      {(label || hint) ? (
        <span>
          {label ? <span className="block text-sm font-medium text-foreground">{label}</span> : null}
          {hint ? <span className="block text-xs text-muted-foreground">{hint}</span> : null}
        </span>
      ) : null}
    </label>
  );
});

