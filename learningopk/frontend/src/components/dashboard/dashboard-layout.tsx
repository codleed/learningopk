import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

/* ------------------------------------------------------------------ */
/*  3-Zone Dashboard Layout                                            */
/*                                                                     */
/*  Mobile (< lg):  stacked vertically — Hero → Primary → Secondary    */
/*  Desktop (≥ lg): 3-column grid                                      */
/*                                                                     */
/*  ┌─────────────────────────────────────────────┐                    */
/*  │ Zone 1 – Hero (full width)                  │                    */
/*  ├────────────────────────┬────────────────────┤                    */
/*  │ Zone 2 – Primary       │ Zone 3 – Secondary │                    */
/*  │ (2/3 width)            │ (1/3 sticky)       │                    */
/*  └────────────────────────┴────────────────────┘                    */
/* ------------------------------------------------------------------ */

type DashboardLayoutProps = {
  /** Zone 1: Hero / Critical — streak, daily goal, XP (always visible) */
  hero: ReactNode;
  /** Zone 2: Primary content — subject progress, focus areas, review */
  primary: ReactNode;
  /** Zone 3: Secondary sidebar — AI memory, starred formulas, groups */
  secondary: ReactNode;
  /** Additional class names on the outer grid container */
  className?: string;
};

export function DashboardLayout({ hero, primary, secondary, className }: DashboardLayoutProps) {
  return (
    <div className={cn("grid grid-cols-1 lg:grid-cols-3 gap-6", className)}>
      {/* ── Zone 1: Hero — full width on all breakpoints ── */}
      <section className="lg:col-span-3" aria-label="Key stats and daily goal">
        {hero}
      </section>

      {/* ── Zone 2: Primary — full width mobile, 2/3 desktop ── */}
      <section className="lg:col-span-2 min-w-0" aria-label="Main learning content">
        {primary}
      </section>

      {/* ── Zone 3: Secondary — full width mobile, 1/3 sticky sidebar desktop ── */}
      <section
        className="lg:col-span-1 lg:sticky lg:top-6 lg:self-start min-w-0"
        aria-label="Supplementary tools and info"
      >
        {secondary}
      </section>
    </div>
  );
}
