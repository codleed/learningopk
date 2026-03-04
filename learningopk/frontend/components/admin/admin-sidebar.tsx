import Link from "next/link";

import { DashboardSurface } from "@/components/foundation/dashboard-primitives";
import { cn } from "@/lib/utils";

import { adminNavItems, isAdminNavItemActive } from "./admin-nav-config";

type AdminSidebarProps = {
  currentPath: string;
  onNavigate?: () => void;
};

export function AdminSidebar({ currentPath, onNavigate }: AdminSidebarProps) {
  return (
    <DashboardSurface as="aside" tone="rail" className="p-4">
      <div className="mb-4 border-b border-border pb-4">
        <p className="text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">Administration</p>
        <p className="mt-1 text-lg font-semibold tracking-[-0.01em] text-foreground">Command Center</p>
      </div>

      <nav aria-label="Admin section navigation" className="space-y-2">
        {adminNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = isAdminNavItemActive(currentPath, item);

          return (
            <Link
              key={item.href}
              href={item.href}
              aria-current={isActive ? "page" : undefined}
              onClick={onNavigate}
              className={cn(
                "flex items-center gap-3 rounded-2xl border px-3 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "border-primary/45 bg-primary/10 text-foreground shadow-[0_14px_30px_-22px_rgba(53,67,184,0.6)]"
                  : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/65 hover:text-foreground"
              )}
            >
              <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-background/75 dark:bg-card/80">
                <Icon className="h-4 w-4" aria-hidden />
              </span>
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </DashboardSurface>
  );
}
