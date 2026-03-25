import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type StatItem = {
  label: string;
  value: string | number;
  icon?: ReactNode;
};

type AdminStatsStripProps = {
  stats: StatItem[];
  className?: string;
};

export function AdminStatsStrip({ stats, className }: AdminStatsStripProps) {
  return (
    <div
      className={cn("flex flex-wrap items-center gap-[var(--space-6)]", className)}
    >
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-3">
          {stat.icon && (
            <span className="text-[var(--muted-foreground)]" aria-hidden>
              {stat.icon}
            </span>
          )}
          <div className="flex flex-col">
            <span
              className="font-mono text-foreground"
              style={{ fontSize: "2rem", fontWeight: 700 }}
            >
              {stat.value}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--muted-foreground)]">
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
