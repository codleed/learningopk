"use client";

import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { useState, type ReactNode } from "react";

import { Button } from "@/components/ui/button";

import type { AdminSession } from "./admin-guard";
import { AdminSidebar } from "./admin-sidebar";
import { AdminTopbar } from "./admin-topbar";

type AdminShellProps = {
  children: ReactNode;
  session: AdminSession;
};

export function AdminShell({ children, session }: AdminShellProps) {
  const currentPath = usePathname() ?? "/admin";
  const [isMobileNavigationOpen, setIsMobileNavigationOpen] = useState(false);

  return (
    <div className="min-h-screen bg-transparent">
      <a
        href="#main-content"
        className="sr-only rounded-md bg-primary px-3 py-2 text-sm font-semibold text-primary-foreground focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-50"
      >
        Skip to content
      </a>

      <div className="mx-auto w-full max-w-[97rem] px-4 pb-12 pt-6 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-col gap-4 lg:flex-row lg:items-start lg:gap-5">
          <div className="hidden lg:sticky lg:top-4 lg:block lg:w-[16.75rem] lg:self-start">
            <AdminSidebar currentPath={currentPath} />
          </div>
          <div className="min-w-0 flex-1 space-y-4">
            <AdminTopbar session={session} onOpenNavigation={() => setIsMobileNavigationOpen(true)} />
            <main id="main-content" className="min-w-0">
              {children}
            </main>
          </div>
        </div>
      </div>

      {isMobileNavigationOpen ? (
        <div className="lg:hidden">
          <button
            type="button"
            className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm"
            aria-label="Dismiss navigation overlay"
            onClick={() => setIsMobileNavigationOpen(false)}
          />
          <div className="fixed inset-y-0 left-0 z-50 w-[88vw] max-w-sm p-4">
            <div className="mb-2 flex justify-end">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                aria-label="Close navigation"
                onClick={() => setIsMobileNavigationOpen(false)}
              >
                <X className="h-4 w-4" aria-hidden />
              </Button>
            </div>
            <AdminSidebar currentPath={currentPath} onNavigate={() => setIsMobileNavigationOpen(false)} />
          </div>
        </div>
      ) : null}
    </div>
  );
}
