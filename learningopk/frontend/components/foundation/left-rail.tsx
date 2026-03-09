"use client";

import {
  Books,
  CalendarBlank,
  CaretDoubleLeft,
  CaretDoubleRight,
  ChartPieSlice,
  ChatCircleText,
  GearSix,
  HouseLine,
  Robot,
  ShieldCheck,
  SignOut,
} from "@phosphor-icons/react";
import type { Icon } from "@phosphor-icons/react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState } from "react";

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
  const [isCollapsed, setIsCollapsed] = useState(false);

  const dashboardLabel = useMemo(() => {
    const trimmedName = session.user.name?.trim();
    return trimmedName?.length ? trimmedName : "LearningoPK";
  }, [session.user.name]);

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
      className={cn(
        "min-w-0 lg:sticky lg:top-4 lg:self-start lg:transition-[width] lg:duration-300",
        isCollapsed ? "lg:w-[5.75rem]" : "lg:w-[16.75rem]",
      )}
      data-testid="left-rail"
      data-collapsed={isCollapsed ? "true" : "false"}
    >
      <DashboardSurface as="section" tone="rail" className={cn("py-4 transition-[padding] duration-300", isCollapsed ? "px-2 lg:px-2.5" : "px-3 sm:px-4")}>
        <div className="relative mb-5">
          <Link
            href="/dashboard"
            className={cn(
              "flex items-center rounded-2xl border border-border bg-secondary/65 text-sm font-semibold text-foreground transition hover:border-primary/25",
              isCollapsed ? "justify-center p-2.5 lg:px-2" : "gap-3 p-3",
            )}
            aria-label={isCollapsed ? dashboardLabel : undefined}
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
            <span className={cn("min-w-0 text-base tracking-[-0.01em]", isCollapsed ? "lg:hidden" : "lg:inline")}>{dashboardLabel}</span>
          </Link>

          <button
            type="button"
            aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
            onClick={() => setIsCollapsed((previous) => !previous)}
            className="absolute -right-2 top-1/2 hidden h-8 w-8 -translate-y-1/2 items-center justify-center rounded-full border border-border bg-background text-muted-foreground shadow-sm transition hover:border-primary/35 hover:text-foreground lg:inline-flex"
          >
            {isCollapsed ? <CaretDoubleRight className="h-4 w-4" aria-hidden /> : <CaretDoubleLeft className="h-4 w-4" aria-hidden />}
          </button>
        </div>

        <p className={cn("px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground", isCollapsed ? "lg:sr-only" : "")}>
          Menu
        </p>
        <nav
          aria-label="Primary navigation"
          className={cn(
            "mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0",
            isCollapsed ? "lg:items-center" : "",
          )}
        >
          {primaryLinks.map((link) => {
            const isActive = link.isActive?.(currentPath) ?? false;
            const LinkIcon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={isCollapsed ? link.label : undefined}
                className={cn(
                  "inline-flex h-11 min-w-max items-center rounded-2xl border text-sm font-semibold transition",
                  isCollapsed ? "gap-0 px-3 lg:h-12 lg:w-12 lg:min-w-0 lg:justify-center lg:px-0" : "gap-2.5 px-3.5",
                  isActive
                    ? "border-primary/45 bg-primary/10 text-foreground shadow-[0_14px_30px_-22px_rgba(53,67,184,0.6)]"
                    : "border-transparent bg-transparent text-muted-foreground hover:border-border hover:bg-secondary/65 hover:text-foreground",
                )}
              >
                <span className={cn("inline-flex items-center justify-center rounded-xl", isCollapsed ? "h-8 w-8 bg-transparent" : "h-7 w-7 bg-background/75 dark:bg-card/80")}>
                  <LinkIcon className="h-[18px] w-[18px]" weight={isActive ? "duotone" : "regular"} aria-hidden />
                </span>
                <span className={cn(isCollapsed ? "lg:hidden" : "lg:inline")}>{link.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-4 border-t border-border pt-4">
          <p className={cn("px-2 text-[0.68rem] font-semibold uppercase tracking-[0.16em] text-muted-foreground", isCollapsed ? "lg:sr-only" : "")}>
            Dashboard Views
          </p>
          <div className={cn("mt-2 flex min-w-0 gap-2 overflow-x-auto pb-1 lg:flex-col lg:overflow-visible lg:pb-0", isCollapsed ? "lg:items-center" : "")}>
            {dashboardStateLinks.map((link) => {
              const LinkIcon = link.icon;
              const isActive = link.isActive?.(currentPath) ?? false;

              return (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-label={isCollapsed ? link.label : undefined}
                  className={cn(
                    "inline-flex h-10 min-w-max items-center rounded-2xl border text-xs font-semibold uppercase tracking-[0.08em] transition",
                    isCollapsed ? "gap-0 px-3 lg:h-11 lg:w-12 lg:min-w-0 lg:justify-center lg:px-0" : "gap-2 px-3",
                    isActive
                      ? "border-primary/45 bg-primary/10 text-primary"
                      : "border-border bg-card text-muted-foreground hover:border-primary/25 hover:text-foreground",
                  )}
                >
                  <LinkIcon className="h-3.5 w-3.5" weight={isActive ? "duotone" : "regular"} aria-hidden />
                  <span className={cn(isCollapsed ? "lg:hidden" : "lg:inline")}>{link.label}</span>
                </Link>
              );
            })}
          </div>
        </div>

        <div className="mt-4 border-t border-border pt-4">
          <LogoutButton
            ariaLabel="Log out shortcut"
            icon={<SignOut className="h-[18px] w-[18px]" aria-hidden />}
            hideLabel={isCollapsed}
            className={cn(
              "h-10 rounded-2xl border border-border bg-secondary/65 text-foreground hover:border-primary/25 hover:bg-secondary",
              isCollapsed ? "w-full lg:h-11 lg:w-12 lg:justify-center lg:px-0" : "w-full",
            )}
          />
        </div>
      </DashboardSurface>
    </aside>
  );
}
