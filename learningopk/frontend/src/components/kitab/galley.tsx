import { forwardRef, type HTMLAttributes, type ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Galley — the reading column. Enforces the 68ch measure and
   generous margins; used for all longform content.
   ═══════════════════════════════════════════════════════════════ */

export const Galley = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(function Galley(
  { className, children, ...rest },
  ref
) {
  return (
    <div
      ref={ref}
      className={cn("mx-auto w-full max-w-[68ch] text-body text-ink", className)}
      {...rest}
    >
      {children}
    </div>
  );
});

/* ═══════════════════════════════════════════════════════════════
   Wire — spine for side-by-side content (a folio + its margin).
   Desktop: two columns with a hairline spine between. Mobile: stack.
   ═══════════════════════════════════════════════════════════════ */

export const Wire = forwardRef<
  HTMLDivElement,
  HTMLAttributes<HTMLDivElement> & { lead?: ReactNode; margin?: ReactNode }
>(function Wire({ lead, margin, className, children, ...rest }, ref) {
  return (
    <div
      ref={ref}
      className={cn(
        "grid gap-8 lg:grid-cols-[minmax(0,1fr)_260px]",
        "lg:divide-x lg:divide-hairline",
        className
      )}
      {...rest}
    >
      <div className="min-w-0 lg:pr-8">{lead ?? children}</div>
      {margin ? <aside className="min-w-0 lg:pl-8">{margin}</aside> : null}
    </div>
  );
});
