import type { ReactNode } from "react";

import { AppShell } from "@/components/foundation/app-shell";
import { DashboardSurface } from "@/components/foundation/dashboard-primitives";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type DashboardChromePath = "/dashboard" | "/forum" | "/ai-tutor";

type DashboardChromeLayoutProps = {
  session: SessionPayload | null;
  currentPath: DashboardChromePath;
  header: ReactNode;
  children: ReactNode;
  contentClassName?: string;
};

export function DashboardChromeLayout({
  session,
  currentPath,
  header,
  children,
  contentClassName
}: DashboardChromeLayoutProps) {
  return (
    <AppShell
      session={session}
      currentPath={currentPath}
      contentClassName="max-w-[95rem] px-3 pb-10 pt-4 sm:px-5 lg:px-7"
    >
      <DashboardSurface as="section" tone="shell" data-testid="dashboard-chrome-shell" className="p-3 sm:p-4 lg:p-5">
        <div className={cn("relative min-w-0 space-y-4", contentClassName)}>
          {header}
          {children}
        </div>
      </DashboardSurface>
    </AppShell>
  );
}

type DashboardChromeHeaderProps = {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  actions?: ReactNode;
  className?: string;
};

export function DashboardChromeHeader({ title, subtitle, eyebrow, actions, className }: DashboardChromeHeaderProps) {
  return (
    <DashboardSurface
      as="header"
      tone="header"
      data-testid="dashboard-chrome-header"
      className={cn("px-4 py-4 sm:px-6", className)}
    >
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-[12rem]">
          {eyebrow ? (
            <p className="text-xs font-semibold uppercase tracking-[0.07em] text-primary">{eyebrow}</p>
          ) : null}
          <h1 className="mt-1 text-3xl font-medium tracking-tight text-foreground sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 max-w-3xl text-sm text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
      </div>
    </DashboardSurface>
  );
}
