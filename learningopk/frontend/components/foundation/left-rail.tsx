import {
  Books,
  CalendarBlank,
  ChartPieSlice,
  ChatCircleText,
  GearSix,
  HouseLine,
  Robot,
  ShieldCheck,
} from "@phosphor-icons/react/dist/ssr";
import type { Icon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";

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
  icon: Icon;
  isActive?: (currentPath: string) => boolean;
};

const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

export function LeftRail({ session, currentPath = "/" }: LeftRailProps) {
  const primaryLinks: RailLink[] = [
    {
      href: "/dashboard",
      label: "Dashboard",
      icon: HouseLine,
      isActive: (path) => isPathPrefix(path, "/dashboard"),
    },
    {
      href: "/subjects",
      label: "Subjects",
      icon: Books,
      isActive: (path) => isPathPrefix(path, "/subjects"),
    },
    {
      href: "/stats",
      label: "Stats",
      icon: ChartPieSlice,
      isActive: (path) => isPathPrefix(path, "/stats"),
    },
    {
      href: "/forum",
      label: "Forum",
      icon: ChatCircleText,
      isActive: (path) => isPathPrefix(path, "/forum"),
    },
    {
      href: "/ai-tutor",
      label: "AI Tutor",
      icon: Robot,
      isActive: (path) => isPathPrefix(path, "/ai-tutor"),
    },
  ];

  if (session.user.role === "admin") {
    primaryLinks.push({
      href: "/admin",
      label: "Admin",
      icon: ShieldCheck,
      isActive: (path) => isPathPrefix(path, "/admin"),
    });
  }

  const dashboardStateLinks: RailLink[] = [
    {
      href: "/dashboard?rail=calendar",
      label: "Calendar",
      icon: CalendarBlank,
    },
    {
      href: "/settings",
      label: "Settings",
      icon: GearSix,
      isActive: (path) => isPathPrefix(path, "/settings"),
    },
  ];

  return (
    <aside
      className="min-w-0 lg:sticky lg:top-4 lg:w-[16.75rem] lg:self-start"
      data-testid="left-rail"
    >
      <DashboardSurface as="section" tone="rail" className="px-3 py-4 sm:px-4">
        <Link
          href="/dashboard"
          className="mb-5 flex items-center gap-3 rounded-2xl border border-border bg-secondary/65 p-3 text-sm font-semibold text-foreground transition hover:border-primary/25"
        >
          <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-[linear-gradient(145deg,#2b3ca8_0%,#4d62db_100%)] p-2 shadow-[0_14px_24px_-16px_rgba(43,60,168,0.8)]">
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={28}
              height={28}
              className="h-7 w-7 rounded-lg object-cover"
              priority
            />
          </span>
          <span className="text-base tracking-[-0.01em]">LearningoPK</span>
        </Link>

        <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Menu
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
                  "inline-flex h-11 min-w-max items-center gap-2.5 rounded-2xl border px-3.5 text-sm font-semibold transition",
                  isActive
                    ? "border-primary/45 bg-primary/10 text-foreground shadow-[0_14px_30px_-22px_rgba(53,67,184,0.6)]"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/65 hover:text-foreground",
                )}
              >
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-background/75 dark:bg-card/80">
                  <LinkIcon className="h-[18px] w-[18px]" weight={isActive ? "duotone" : "regular"} aria-hidden />
                </span>
                <span>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className="px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground">
            Dashboard Views
          </p>
          <div className="mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0">
            {dashboardStateLinks.map((link) => {
              const LinkIcon = link.icon;
              const isActive = link.isActive?.(currentPath) ?? false;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "inline-flex h-10 min-w-max items-center gap-2 rounded-2xl border px-3 text-xs font-semibold uppercase tracking-[0.08em] transition",
                    isActive
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" weight={isActive ? "duotone" : "regular"} aria-hidden />
                  <span>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <LogoutButton
            ariaLabel="Log out shortcut"
            className="h-10 w-full rounded-2xl border border-border bg-secondary/65 text-foreground hover:border-primary/25 hover:bg-secondary"
          />
        </div>
      </DashboardSurface>
    </aside>
  );
}
