import {
  Bot,
  BarChart3,
  BookOpen,
  CalendarDays,
  LayoutDashboard,
  MessageSquare,
  Settings,
  Shield,
} from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import type { ComponentType } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { DashboardSurface } from "@/components/foundation/dashboard-primitives";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
};

type RailLink = {
  href: string;
  label: string;
  icon: ComponentType<{ className?: string }>;
  isActive?: (currentPath: string) => boolean;
};

const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

export function LeftRail({ session, currentPath = "/" }: LeftRailProps) {
  const primaryLinks: RailLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: LayoutDashboard,
      isActive: (path) => isPathPrefix(path, "/dashboard"),
    },
    {
      href: "/subjects",
      label: "Subjects",
      icon: BookOpen,
      isActive: (path) => isPathPrefix(path, "/subjects"),
    },
    {
      href: "/stats",
      label: "Stats",
      icon: BarChart3,
      isActive: (path) => isPathPrefix(path, "/stats"),
    },
    {
      href: "/forum",
      label: "Forum",
      icon: MessageSquare,
      isActive: (path) => isPathPrefix(path, "/forum"),
    },
    {
      href: "/ai-tutor",
      label: "AI Tutor",
      icon: Bot,
      isActive: (path) => isPathPrefix(path, "/ai-tutor"),
    },
  ];

  if (session.user.role === "admin") {
    primaryLinks.push({
      href: "/admin",
      label: "Admin",
      icon: Shield,
      isActive: (path) => isPathPrefix(path, "/admin"),
    });
  }

  const dashboardStateLinks: RailLink[] = [
    {
      href: "/dashboard?rail=calendar",
      label: "Calendar",
      icon: CalendarDays,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: Settings,
      isActive: (path) => isPathPrefix(path, "/settings"),
    },
  ];

  return (
    <aside
      className="min-w-0 lg:sticky lg:top-4 lg:w-56 lg:self-start"
      data-testid="left-rail"
    >
      <DashboardSurface as="section" tone="rail" className="px-2 py-3 sm:px-3">
        <Link
          href="/dashboard"
          className="mb-3 inline-flex items-center gap-2 rounded-xl  bg-card px-2 py-2 text-sm font-semibold text-foreground transition hover:border-primary/35"
        >
          <Image
            src="/new_logo.png"
            alt="LearningoPK logo"
            width={28}
            height={28}
            className="h-7 w-7 rounded-md object-cover"
            priority
          />
          <span>LearningoPK</span>
        </Link>
        <p className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
          Navigation
        </p>
        <nav
          aria-label="Primary navigation"
          className="mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0"
        >
          {primaryLinks.map((link) => {
            const isActive = link.isActive?.(currentPath) ?? false;
            const LinkIcon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                className={cn(
                  "inline-flex h-10 min-w-max items-center gap-2 rounded-xl border px-3 text-sm font-semibold transition",
                  isActive
                    ? "border-primary/45 bg-primary/10 text-foreground"
                    : "border-border bg-card text-muted-foreground hover:border-primary/35 hover:text-foreground",
                )}
              >
                <LinkIcon className="h-4 w-4" aria-hidden />
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-3 border-t border-border pt-3">
          <p className="px-2 text-xs font-semibold uppercase tracking-[0.08em] text-muted-foreground">
            Dashboard Views
          </p>
          <div className="mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {dashboardStateLinks.map((link) => {
              const LinkIcon = link.icon;
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className="inline-flex h-9 min-w-max items-center gap-2 rounded-xl border border-border bg-card px-3 text-xs font-semibold uppercase tracking-[0.06em] text-muted-foreground transition hover:border-primary/35 hover:text-foreground"
                >
                  <LinkIcon className="h-3.5 w-3.5" aria-hidden />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-3 border-t border-border px-2 pt-3">
          <LogoutButton
            ariaLabel="Log out shortcut"
            className="w-full border border-primary/35 bg-primary/10 text-foreground hover:border-primary/45 hover:bg-primary/20"
          />
        </div>
      </DashboardSurface>
    </aside>
  );
}
