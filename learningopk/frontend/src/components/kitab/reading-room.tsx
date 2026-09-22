import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   ReadingRoom — the prose page: masthead rule, serif lede,
   68ch measure, drop-capable body. For chapter/summary reading.
   ═══════════════════════════════════════════════════════════════ */

export const ReadingRoom = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & {
    kicker: string;
    title: string;
    lede?: string;
    children: React.ReactNode;
  }
>(function ReadingRoom({ kicker, title, lede, className, children, ...rest }, ref) {
  return (
    <article ref={ref} className={cn("mx-auto w-full max-w-[68ch]", className)} {...rest}>
      <div className="overline text-brick-deep">{kicker}</div>
      <h1 className="mt-2 font-display text-display font-semibold text-ink">{title}</h1>
      <div className="mt-4 border-ink border-t-[3px] relative after:absolute after:left-0 after:right-0 after:top-[3px] after:border-ink after:border-t" />
      {lede ? <p className="mt-6 font-display text-heading font-medium text-ink">{lede}</p> : null}
      <div className="mt-6 text-body leading-[1.8] text-ink-soft">{children}</div>
    </article>
  );
});
