import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Folio — the sheet of paper. Replaces Card.
   Separation is achieved by tint and hairline; the plain and
   raised tones also carry a soft shadow (elevation allowed).
   ═══════════════════════════════════════════════════════════════ */

export type FolioTone = "plain" | "raised" | "dim" | "brick" | "moss" | "ochre";

const toneStyles: Record<FolioTone, string> = {
  plain: "bg-paper-raised border border-hairline shadow-[var(--shadow-sm)]",
  raised: "bg-paper-dim border border-hairline shadow-[var(--shadow-md)]",
  dim: "bg-paper-dim border border-hairline",
  brick: "bg-accent-tint border border-accent/40",
  moss: "bg-moss-tint border border-moss/40",
  ochre: "bg-ochre-tint border border-ochre/40",
};

export interface FolioProps extends HTMLAttributes<HTMLDivElement> {
  tone?: FolioTone;
  /** Children. */
  children?: ReactNode;
}

export const Folio = forwardRef<HTMLDivElement, FolioProps>(function Folio(
  { tone = "plain", className, children, ...rest },
  ref
) {
  return (
    <div ref={ref} className={cn("rounded-folio", toneStyles[tone], className)} {...rest}>
      {children}
    </div>
  );
});

/** Caps label at the top of a folio, above a hairline. */
export function FolioHeader({
  title,
  className,
  children,
}: {
  title: string;
  className?: string;
  children?: ReactNode;
}) {
  return (
    <div className={cn("border-b border-hairline px-5 py-3", className)}>
      <span className="overline text-ink-soft">{title}</span>
      {children ? <div className="mt-1">{children}</div> : null}
    </div>
  );
}

/** The reading body of a folio. */
export const FolioBody = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  function FolioBody({ className, children, ...rest }, ref) {
    return (
      <div ref={ref} className={cn("px-5 py-4", className)} {...rest}>
        {children}
      </div>
    );
  }
);
