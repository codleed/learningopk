import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Rule — the typographic line. Elevation is fake; rules are real.
   ═══════════════════════════════════════════════════════════════ */

export type RuleWeight = "hairline" | "ink";
export type RuleStyle = "single" | "double";

export function Rule({
  weight = "hairline",
  style = "single",
  className,
}: {
  weight?: RuleWeight;
  style?: RuleStyle;
  className?: string;
}) {
  return (
    <div
      role="presentation"
      className={cn(
        weight === "ink" ? "border-ink" : "border-hairline",
        style === "single" ? "border-t" : "border-double border-t-[3px]",
        className
      )}
    />
  );
}

/** The masthead rule: 3px ink over 1px ink — the signature motif. */
export function MastheadRule({ className }: { className?: string }) {
  return (
    <div role="presentation" className={cn("border-ink border-t-[3px] relative", className)}>
      <div className="border-ink border-t absolute left-0 right-0 top-[3px]" />
    </div>
  );
}
