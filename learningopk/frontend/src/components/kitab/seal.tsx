import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Seal — circular proof-mark ("completed", "verified", rank medal).
   Brass/ochre = honor; moss = progress; ink = neutral.
   ═══════════════════════════════════════════════════════════════ */

export type SealTone = "ink" | "moss" | "brass";

const sealTones: Record<SealTone, string> = {
  ink: "border-hairline-strong text-ink",
  moss: "border-moss text-moss-deep",
  brass: "border-ochre text-ochre",
};

export interface SealProps extends HTMLAttributes<HTMLSpanElement> {
  tone?: SealTone;
  /** Accessible name, e.g. "Completed chapter 3". */
  label: string;
  children?: ReactNode;
}

export const Seal = forwardRef<HTMLSpanElement, SealProps>(function Seal(
  { tone = "ink", label, className, children, ...rest },
  ref
) {
  return (
    <span
      ref={ref}
      role="img"
      aria-label={label}
      title={label}
      className={cn(
        "inline-flex items-center justify-center rounded-[8px] border bg-paper-dim font-mono",
        "h-7 w-7 shrink-0",
        sealTones[tone],
        className
      )}
      {...rest}
    >
      {children}
    </span>
  );
});
