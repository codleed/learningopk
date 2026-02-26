import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function PageHeader({ title, subtitle, eyebrow, actions, className }: PageHeaderProps) {
  return (
    <header className={cn("surface-card rounded-3xl border border-border p-6 sm:p-8", className)}>
      <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
        <div className="space-y-2">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{eyebrow}</p>
          ) : null}
          <h1 className="text-3xl font-semibold leading-tight text-foreground sm:text-4xl">{title}</h1>
          {subtitle ? <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2 sm:justify-end">{actions}</div> : null}
      </div>
    </header>
  );
}

