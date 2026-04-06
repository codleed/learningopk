import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminPageHeaderProps = {
  eyebrow?: string;
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({ eyebrow, title, subtitle, actions, className }: AdminPageHeaderProps) {
  return (
    <header className={cn("flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between", className)}>
      <div className="space-y-2">
        {eyebrow && (
          <p className="text-xs font-semibold uppercase tracking-[0.14em] text-[var(--text-secondary)]">
            {eyebrow}
          </p>
        )}
        <h1
          className="font-heading text-text-primary"
          style={{ fontSize: "2rem", fontWeight: 400 }}
        >
          {title}
        </h1>
        {subtitle && (
          <p className="max-w-3xl text-sm text-[var(--text-secondary)]">{subtitle}</p>
        )}
      </div>
      {actions && (
        <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div>
      )}
    </header>
  );
}
