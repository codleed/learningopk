"use client";

import { usePathname } from "next/navigation";
import type { ReactNode } from "react";

import type { AdminSession } from "./admin-guard";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

type AdminShellProps = {
  children: ReactNode;
  session: AdminSession;
};

export function AdminShell({ children, session }: AdminShellProps) {
  const currentPath = usePathname() ?? "/admin";

  return (
    <div className="min-h-screen bg-slate-100">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      <div className="mx-auto w-full max-w-[1400px] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-6">
          <div className="lg:sticky lg:top-4 lg:w-80 lg:self-start">
            <AdminSidebar currentPath={currentPath} />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <AdminTopbar session={session} />
            <main id="main-content" className="min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>
    </div>
  );
}
