import { forwardRef, type InputHTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Field — form control that looks like a printed form entry.
   Underline box: 1px hairline at the bottom, 2px ink on focus.
   Label always visible above (caps, small).
   ═══════════════════════════════════════════════════════════════ */

export interface FieldProps extends InputHTMLAttributes<HTMLInputElement> {
  /** Visible label — never a floating placeholder. */
  label: string;
  /** Short helper text under the box. */
  hint?: string;
  /** Error message; sets aria-invalid and plum color. */
  error?: string;
  /** Right-side adornment (unit, currency, toggle). */
  adornment?: ReactNode;
  /** Full-width control. */
  fullWidth?: boolean;
}

export const Field = forwardRef<HTMLInputElement, FieldProps>(function Field(
  { label, hint, error, adornment, fullWidth = false, className, id, ...rest },
  ref
) {
  const fieldId = id ?? `field-${label.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
  const hintId = hint ? `${fieldId}-hint` : undefined;
  const errorId = error ? `${fieldId}-error` : undefined;

  return (
    <div className={cn(fullWidth && "w-full", className)}>
      <label htmlFor={fieldId} className="mb-1.5 block overline text-ink-faint">
        {label}
      </label>
      <div
        className={cn(
          "flex items-center gap-2 bg-paper-dim px-3 border rounded-[8px] h-10",
          "transition-colors duration-[var(--press)]",
          "focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/40",
          error && "border-plum"
        )}
      >
        <input
          ref={ref}
          id={fieldId}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error ? errorId : hint ? hintId : undefined}
          className={cn(
            "h-10 w-full bg-transparent text-body text-ink",
            "placeholder:text-ink-faint",
            "outline-none"
          )}
          {...rest}
        />
        {adornment ? (
          <span className="shrink-0 text-caption text-ink-faint">{adornment}</span>
        ) : null}
      </div>
      {error ? (
        <p id={errorId} className="mt-1.5 text-caption text-plum">
          {error}
        </p>
      ) : hint ? (
        <p id={hintId} className="mt-1.5 text-caption text-ink-faint">
          {hint}
        </p>
      ) : null}
    </div>
  );
});
