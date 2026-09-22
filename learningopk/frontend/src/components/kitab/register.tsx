import { forwardRef, type HTMLAttributes } from "react";
import { cn } from "@/lib/utils";

/* ═══════════════════════════════════════════════════════════════
   Register — vertical ledger of dated entries.
   Replaces timeline/activity cards. Mono numerals, hairlines.
   ═══════════════════════════════════════════════════════════════ */

export type RegisterEntry = {
  /** ISO date or short stamp, e.g. "Sep 21". */
  when: string;
  /** One-line description. */
  what: string;
  /** Mono metric column, e.g. "12/20" or "+40 xp". */
  amount?: string;
  /** Optional destination. */
  href?: string;
};

export const Register = forwardRef<
  HTMLElement,
  HTMLAttributes<HTMLElement> & { entries: RegisterEntry[]; caption?: string }
>(function Register({ entries, caption, className, ...rest }, ref) {
  return (
    <section
      ref={ref}
      aria-label={caption ?? "Activity register"}
      className={cn("text-data", className)}
      {...rest}
    >
      {caption ? <div className="overline mb-2 text-ink-faint">{caption}</div> : null}
      <ol className="border-t border-hairline">
        {entries.map((entry, i) => {
          const row = (
            <>
              <span className="tnum shrink-0 text-ink-faint">{entry.when}</span>
              <span className="min-w-0 flex-1 truncate text-ink">{entry.what}</span>
              {entry.amount ? (
                <span className="tnum shrink-0 text-right text-graphite">{entry.amount}</span>
              ) : null}
            </>
          );
          return (
            <li
              key={`${entry.when}-${entry.what}-${i}`}
              className="list-none border-b border-hairline hover:bg-accent-tint"
            >
              {entry.href ? (
                <a href={entry.href} className="flex items-baseline gap-4 py-2">
                  {row}
                </a>
              ) : (
                <div className="flex items-baseline gap-4 py-2">{row}</div>
              )}
            </li>
          );
        })}
      </ol>
    </section>
  );
});
