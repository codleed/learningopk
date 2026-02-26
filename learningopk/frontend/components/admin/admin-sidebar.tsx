import Link from "next/link";

import { cn } from "@/lib/utils";

import { adminNavItems, isAdminNavItemActive } from "./admin-nav-config";

type AdminSidebarProps = {
  currentPath: string;
  onNavigate?: () => void;
};

export function AdminSidebar({ currentPath, onNavigate }: AdminSidebarProps) {
  return (
    <aside className="surface-card rounded-3xl border border-slate-700/60 bg-slate-900 p-4 text-slate-100 shadow-xl">
      <div className="mb-4 border-b border-slate-700/70 pb-4">
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-slate-400">Administration</p>
        <p className="mt-1 text-lg font-semibold text-slate-100">Command Center</p>
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
                  ? "border-lime-300/40 bg-lime-300/15 text-white"
                  : "border-slate-700 bg-slate-900 text-slate-200 hover:border-lime-300/35 hover:bg-slate-800 hover:text-white"
              )}
            >
              <Icon className="h-4 w-4" aria-hidden />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}
