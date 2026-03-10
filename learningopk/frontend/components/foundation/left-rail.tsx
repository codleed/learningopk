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
import { useMemo } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
  isCollapsed: boolean;
  onToggle: () => void;
};

type RailLink = {
  href: string;
  label: string;
  icon: Icon;
  isActive?: (currentPath: string) => boolean;
};

const isPathPrefix = (currentPath: string, target: string): boolean =>
  currentPath === target || currentPath.startsWith(`${target}/`);

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

export function LeftRail({
  session,
  currentPath = "/",
  isCollapsed,
  onToggle,
}: LeftRailProps) {
  const displayName = useMemo(() => {
    const trimmedName = session.user.name?.trim();
    return trimmedName?.length ? trimmedName : "LearningoPK";
  }, [session.user.name]);

  const avatarInitials = getInitials(displayName);

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

  const secondaryLinks: RailLink[] = [
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
        "fixed inset-y-0 left-0 z-40 flex flex-col bg-sidebar transition-[width] duration-300 ease-in-out overflow-y-auto",
        isCollapsed ? "w-[4.5rem]" : "w-[15rem]",
      )}
      data-testid="left-rail"
      data-collapsed={isCollapsed ? "true" : "false"}
    >
      <nav
        aria-label="Primary navigation"
        className="flex h-full flex-col items-start px-3 py-5"
      >
        {/* Logo row */}
        <div
          className={cn(
            "mb-6 flex w-full items-center",
            isCollapsed ? "justify-center" : "gap-3 px-1",
          )}
        >
          <Link
            href="/dashboard"
            aria-label="Home"
            className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-foreground p-2 shadow-md transition hover:shadow-lg"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={28}
              height={28}
              className="h-6 w-6 rounded-md object-cover invert"
              priority
            />
          </Link>
          {!isCollapsed && (
            <span className="truncate text-sm font-semibold text-sidebar-foreground">
              {displayName}
            </span>
          )}
        </div>

        {/* Primary nav */}
        <div className="flex w-full flex-col gap-1">
          {primaryLinks.map((link) => {
            const isActive = link.isActive?.(currentPath) ?? false;
            const LinkIcon = link.icon;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-current={isActive ? "page" : undefined}
                aria-label={isCollapsed ? link.label : undefined}
                title={link.label}
                className={cn(
                  "flex h-11 items-center rounded-2xl transition-all duration-200",
                  isCollapsed
                    ? "w-11 justify-center mx-auto"
                    : "w-full gap-3 px-3",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <LinkIcon
                  className="h-5 w-5 shrink-0"
                  weight={isActive ? "fill" : "regular"}
                  aria-hidden
                />
                {!isCollapsed && (
                  <span className="truncate text-sm font-medium">
                    {link.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Separator */}
        <div
          className={cn(
            "my-3 h-px bg-sidebar-border",
            isCollapsed ? "mx-auto w-6" : "w-full",
          )}
        />

        {/* Secondary nav */}
        <div className="flex w-full flex-col gap-1">
          {secondaryLinks.map((link) => {
            const LinkIcon = link.icon;
            const isActive = link.isActive?.(currentPath) ?? false;

            return (
              <Link
                key={link.href}
                href={link.href}
                aria-label={isCollapsed ? link.label : undefined}
                title={link.label}
                className={cn(
                  "flex h-11 items-center rounded-2xl transition-all duration-200",
                  isCollapsed
                    ? "w-11 justify-center mx-auto"
                    : "w-full gap-3 px-3",
                  isActive
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
                    : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <LinkIcon
                  className="h-5 w-5 shrink-0"
                  weight={isActive ? "fill" : "regular"}
                  aria-hidden
                />
                {!isCollapsed && (
                  <span className="truncate text-sm font-medium">
                    {link.label}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* Spacer */}
        <div className="flex-1" />

        {/* Collapse toggle */}
        <button
          type="button"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
          onClick={onToggle}
          className={cn(
            "flex h-11 items-center rounded-2xl text-sidebar-foreground/40 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isCollapsed ? "w-11 justify-center mx-auto" : "w-full gap-3 px-3",
          )}
        >
          {isCollapsed ? (
            <CaretDoubleRight className="h-5 w-5 shrink-0" aria-hidden />
          ) : (
            <CaretDoubleLeft className="h-5 w-5 shrink-0" aria-hidden />
          )}
          {!isCollapsed && (
            <span className="truncate text-sm font-medium">Collapse</span>
          )}
        </button>

        {/* Logout */}
        <LogoutButton
          ariaLabel="Log out"
          icon={<SignOut className="h-5 w-5 shrink-0" aria-hidden />}
          hideLabel={isCollapsed}
          className={cn(
            "mt-1 flex h-11 items-center rounded-2xl border-0 bg-transparent text-sidebar-foreground/50 transition-all duration-200 hover:bg-sidebar-accent hover:text-sidebar-foreground",
            isCollapsed ? "w-11 justify-center mx-auto" : "w-full gap-3 px-3",
          )}
        />

        {/* User avatar */}
        <Link
          href="/settings"
          aria-label={`Profile: ${displayName}`}
          title={displayName}
          className={cn(
            "mt-2 flex shrink-0 items-center transition",
            isCollapsed
              ? "mx-auto h-10 w-10 justify-center rounded-full bg-[var(--pastel-warm-sand)] text-xs font-bold text-sidebar-foreground hover:ring-2 hover:ring-sidebar-foreground/20"
              : "w-full gap-3 rounded-2xl px-3 py-2 hover:bg-sidebar-accent",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-[var(--pastel-warm-sand)] text-xs font-bold text-sidebar-foreground",
              isCollapsed ? "h-10 w-10" : "h-9 w-9",
            )}
          >
            {avatarInitials}
          </span>
          {!isCollapsed && (
            <span className="truncate text-sm font-medium text-sidebar-foreground">
              {displayName}
            </span>
          )}
        </Link>
      </nav>
    </aside>
  );
}
