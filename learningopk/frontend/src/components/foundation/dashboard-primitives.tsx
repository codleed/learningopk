import type { ComponentPropsWithoutRef, ElementType, ReactNode } from "react";

import { cn } from "@/lib/utils";

const dashboardSurfaceToneClassNames = {
  shell: "relative overflow-visible bg-transparent",
  rail: "rounded-2xl border border-border-default/70 bg-transparent",
  header: "border-b border-border-default/75",
  hero: "border-b border-border-default/75",
  panel: "border-b border-border-default/70",
  card: "border-b border-border-default/60",
  toolbarButton:
    "rounded-full border border-[var(--primary)]/35 bg-[var(--primary)]/10 px-3.5 py-1.5 text-xs font-semibold uppercase tracking-[0.08em] text-[var(--primary)] transition hover:border-[var(--primary)]/55 hover:bg-[var(--primary)]/15"
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
  return <div className={cn("flex flex-wrap items-center justify-between gap-3", className)} {...props} />;
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
    <DashboardSurface as="section" tone="panel" className={cn("pb-6", className)}>
      <DashboardToolbar>
        <div>
          <h2 className="text-[1.1rem] font-semibold tracking-[-0.01em] text-text-primary sm:text-xl">{title}</h2>
          {subtitle ? <p className="mt-1 text-xs font-medium uppercase tracking-[0.08em] text-text-secondary">{subtitle}</p> : null}
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
