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
    <div className={cn("flex flex-wrap items-center gap-[var(--space-6)]", className)}>
      {stats.map((stat, index) => (
        <div key={index} className="flex items-center gap-3">
          {stat.icon && (
            <span className="text-[var(--text-secondary)]" aria-hidden>
              {stat.icon}
            </span>
          )}
          <div className="flex flex-col">
            <span
              className="font-mono text-text-primary"
              style={{ fontSize: "2rem", fontWeight: 700 }}
            >
              {stat.value}
            </span>
            <span className="text-xs font-semibold uppercase tracking-[0.1em] text-[var(--text-secondary)]">
              {stat.label}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
