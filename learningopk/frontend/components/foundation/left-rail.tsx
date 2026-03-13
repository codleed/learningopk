"use client";

import {
  Books,
  CalendarBlank,
  CaretDoubleLeft,
  CaretDoubleRight,
  CaretDown,
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

type SubmenuItem = {
  href: string;
  label: string;
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

const adminSubmenuItems: SubmenuItem[] = [
  { href: "/admin", label: "Command Center" },
  { href: "/admin/users", label: "Users" },
  { href: "/admin/content", label: "Content" },
  { href: "/admin/moderation", label: "Moderation" },
  { href: "/admin/community", label: "Community" },
  { href: "/admin/forum", label: "Forum" },
  { href: "/admin/analytics", label: "Analytics" },
  { href: "/admin/audit", label: "Audit" },
  { href: "/admin/notifications", label: "Notifications" },
  { href: "/admin/settings", label: "Settings" },
];

export function LeftRail({
  session,
  currentPath = "/",
  isCollapsed,
  onToggle,
}: LeftRailProps) {
  const [isAdminSubmenuOpen, setIsAdminSubmenuOpen] = useState(false);

  const isAdmin = session.user.role === "admin";
  const isOnAdminPage = isPathPrefix(currentPath, "/admin");

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

  const renderPrimaryLink = (link: RailLink) => {
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
  };

  const renderAdminSubmenu = () => {
    if (isCollapsed) {
      return (
        <Link
          href="/admin"
          aria-current={isOnAdminPage ? "page" : undefined}
          title="Admin"
          className={cn(
            "flex h-11 w-11 justify-center mx-auto items-center rounded-2xl transition-all duration-200",
            isOnAdminPage
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          <ShieldCheck className="h-5 w-5" weight={isOnAdminPage ? "fill" : "regular"} aria-hidden />
        </Link>
      );
    }

    return (
      <div className="flex w-full flex-col gap-1">
        <button
          type="button"
          onClick={() => setIsAdminSubmenuOpen(!isAdminSubmenuOpen)}
          className={cn(
            "flex h-11 items-center rounded-2xl transition-all duration-200 w-full gap-3 px-3",
            isOnAdminPage
              ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-md"
              : "text-sidebar-foreground/60 hover:bg-sidebar-accent hover:text-sidebar-foreground",
          )}
        >
          <ShieldCheck
            className="h-5 w-5 shrink-0"
            weight={isOnAdminPage ? "fill" : "regular"}
            aria-hidden
          />
          <span className="flex-1 truncate text-left text-sm font-medium">Admin</span>
          <CaretDown
            className={cn(
              "h-4 w-4 shrink-0 transition-transform duration-200",
              isAdminSubmenuOpen && "rotate-180",
            )}
            aria-hidden
          />
        </button>

        <div
          className={cn(
            "overflow-hidden transition-all duration-200",
            isAdminSubmenuOpen ? "max-h-[500px] opacity-100" : "max-h-0 opacity-0",
          )}
        >
          <div className="flex flex-col gap-1 py-1 pl-4">
            {adminSubmenuItems.map((item) => {
              const isItemActive = currentPath === item.href;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  aria-current={isItemActive ? "page" : undefined}
                  className={cn(
                    "flex h-9 items-center rounded-2xl px-3 text-sm font-medium transition-all duration-200",
                    isItemActive
                      ? "bg-sidebar-accent text-sidebar-foreground"
                      : "text-sidebar-foreground/50 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
                  )}
                >
                  {item.label}
                </Link>
              );
            })}
          </div>
        </div>
      </div>
    );
  };

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
          {primaryLinks.map(renderPrimaryLink)}

          {isAdmin && renderAdminSubmenu()}
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
              ? "mx-auto h-10 w-10 justify-center rounded-full bg-[var(--primary)]/20 text-xs font-bold text-[var(--primary)] hover:ring-2 hover:ring-[var(--primary)]/20"
              : "w-full gap-3 rounded-2xl px-3 py-2 hover:bg-sidebar-accent",
          )}
        >
          <span
            className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-[var(--primary)]/20 text-xs font-bold text-[var(--primary)]",
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
