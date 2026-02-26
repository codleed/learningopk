import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const dashboardSurfaceToneClassNames = {
  shell:
    "relative overflow-hidden rounded-[2rem] border border-border bg-card shadow-[var(--elevation-strong)]",
  rail: "rounded-[1.6rem] border border-border bg-card",
  header: "rounded-[1.6rem] border border-border bg-card",
  hero: "relative overflow-hidden rounded-[1.6rem] border border-primary/35 bg-primary/[0.08]",
  panel: "rounded-[1.4rem] border border-border bg-card",
  card: "rounded-2xl border border-border bg-card",
  toolbarButton:
    "rounded-full border border-primary/35 bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.06em] text-primary transition hover:bg-primary/20"
} as const;

export type DashboardSurfaceTone = keyof typeof dashboardSurfaceToneClassNames;

type DashboardSurfaceProps<T extends ElementType> = {
  as?: T;
  tone?: DashboardSurfaceTone;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function DashboardSurface<T extends ElementType = "div">({
  as,
  tone = "panel",
  className,
  children,
  ...props
}: DashboardSurfaceProps<T>) {
  const Component = as ?? "div";

  return (
    <Component className={cn(dashboardSurfaceToneClassNames[tone], className)} {...props}>
      {children}
    </Component>
  );
}

type DashboardToolbarProps = ComponentPropsWithoutRef<"div">;

export function DashboardToolbar({ className, ...props }: DashboardToolbarProps) {
  return <div className={cn("flex flex-wrap items-center justify-between gap-2", className)} {...props} />;
}

type DashboardSectionProps = {
  title: ReactNode;
  subtitle?: ReactNode;
  actions?: ReactNode;
  children: ReactNode;
  className?: string;
  contentClassName?: string;
};

export function DashboardSection({
  title,
  subtitle,
  actions,
  children,
  className,
  contentClassName
}: DashboardSectionProps) {
  return (
    <DashboardSurface as="section" tone="panel" className={cn("p-4 sm:p-5", className)}>
      <DashboardToolbar>
        <div>
          <h2 className="text-xl font-medium text-foreground">{title}</h2>
          {subtitle ? <p className="text-xs text-muted-foreground">{subtitle}</p> : null}
        </div>
        {actions ? <div>{actions}</div> : null}
      </DashboardToolbar>
      <div className={cn("mt-4", contentClassName)}>{children}</div>
    </DashboardSurface>
  );
}

type DashboardCardProps<T extends ElementType> = {
  as?: T;
  children: ReactNode;
  className?: string;
} & Omit<ComponentPropsWithoutRef<T>, "as" | "className" | "children">;

export function DashboardCard<T extends ElementType = "article">({
  as,
  className,
  children,
  ...props
}: DashboardCardProps<T>) {
  const Component = as ?? "article";

  return (
    <Component className={cn(dashboardSurfaceToneClassNames.card, className)} {...props}>
      {children}
    </Component>
  );
}
