import type { AnchorHTMLAttributes, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/utils";

import { Rule } from "./rule";

/* ═══════════════════════════════════════════════════════════════
   Wayfinding — breadcrumbs-as-text in the title block.
   Replaces sidebar highlight + separate breadcrumb bar.
   Carries orientation with zero persistent chrome.
   ═══════════════════════════════════════════════════════════════ */

export type WayfindingCrumb = {
  label: string;
  href?: string;
};

export function Wayfinding({
  crumbs,
  className,
  ...rest
}: {
  crumbs: WayfindingCrumb[];
  className?: string;
} & AnchorHTMLAttributes<HTMLElement>) {
  return (
    <nav aria-label="Breadcrumb" className={cn("wayfinding", className)} {...rest}>
      {crumbs.map((c, i) => (
        <span key={`${c.label}-${i}`} className="inline-flex items-center">
          {i > 0 && (
            <span aria-hidden="true" className="mx-1.5 text-ink-faint">
              ›
            </span>
          )}
          {c.href ? (
            <Link href={c.href} className="text-ink-soft hover:text-accent">
              {c.label}
            </Link>
          ) : (
            <span aria-current="page" className="text-ink">
              {c.label}
            </span>
          )}
        </span>
      ))}
    </nav>
  );
}

/** The page title block: Wayfinding over display serif over rule. */
export function TitleBlock({
  crumbs,
  title,
  lede,
  actions,
  className,
}: {
  crumbs: WayfindingCrumb[];
  title: ReactNode;
  lede?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("mb-8", className)}>
      <Wayfinding crumbs={crumbs} />
      <div className="mt-2 flex flex-wrap items-end justify-between gap-x-6 gap-y-3">
        <div className="min-w-0">
          <h1 className="text-title font-bold tracking-[-0.02em] text-ink">{title}</h1>
          {lede ? <p className="mt-1.5 max-w-[68ch] text-body text-ink-soft">{lede}</p> : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      <Rule weight="ink" className="mt-4" />
    </header>
  );
}
