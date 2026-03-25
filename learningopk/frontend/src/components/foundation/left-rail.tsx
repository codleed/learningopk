"use client";

import { SignOut } from "@phosphor-icons/react";
import type { LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useCallback } from "react";

import { LogoutButton } from "@/components/auth/logout-button";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";
import { RoleToggle } from "./left-rail/role-toggle";
import type { ViewMode, NavItem as NavItemType } from "./left-rail/left-rail-types";
import {
  studentNavItems,
  adminNavSections,
  isNavItemActive,
} from "./left-rail/left-rail-config";

const RAIL_COLLAPSED_WIDTH = 72;
const RAIL_EXPANDED_WIDTH = 280;

type LeftRailProps = {
  session: SessionPayload;
  currentPath?: string;
  viewMode: ViewMode;
  onViewModeChange: (mode: ViewMode) => void;
};

const getInitials = (name: string): string =>
  name
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("");

interface NavItemProps {
  item: NavItemType;
  isActive: boolean;
  isExpanded: boolean;
  variant: ViewMode;
}

function NavItem({ item, isActive, isExpanded, variant }: NavItemProps) {
  const LinkIcon = item.icon as LucideIcon;
  const isStudentVariant = variant === "student";
  const hasBadge = item.badge && item.badge > 0;

  const baseClasses = `
    group relative flex items-center rounded-xl transition-all duration-150
    focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]
  `;

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={!isExpanded ? item.label : undefined}
      className={cn(
        baseClasses,
        !isExpanded
          ? "h-11 w-11 justify-center mx-auto"
          : isStudentVariant
            ? "h-11 w-full gap-3 px-3"
            : "h-8 w-full gap-2.5 px-3",
        isStudentVariant
          ? isActive
            ? "bg-[var(--sidebar-nav-active-bg)] text-[var(--sidebar-nav-active-text)] shadow-[var(--sidebar-nav-active-shadow)] sidebar-active-glow"
            : "text-[var(--sidebar-nav-default-text)] hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-[var(--sidebar-nav-hover-text)]"
          : isActive
            ? "bg-[var(--sidebar-admin-active-bg)] text-[var(--sidebar-admin-active-text)] shadow-[var(--sidebar-admin-active-shadow)] admin-active-glow"
            : "text-[var(--sidebar-admin-default-text)] hover:bg-[var(--sidebar-admin-hover-bg)] hover:text-[var(--sidebar-admin-hover-text)]"
      )}
    >
      <div className="relative">
        <LinkIcon
          className={cn(
            "shrink-0 transition-all duration-150",
            !isExpanded ? "h-5 w-5" : isStudentVariant ? "h-5 w-5" : "h-[18px] w-[18px]"
          )}
          strokeWidth={isActive ? 2.5 : 2}
          aria-hidden
        />
        {hasBadge && (
          <span
            className={cn(
              "absolute -top-1 -right-1 flex items-center justify-center rounded-full bg-[var(--destructive)] text-[10px] font-bold text-white",
              !isExpanded ? "h-4 w-4 min-w-[16px] min-h-[16px]" : "h-4 w-4 min-w-[16px] min-h-[16px] px-1"
            )}
            style={{ fontSize: "10px", minWidth: "16px", minHeight: "16px" }}
          >
            {item.badge && item.badge > 99 ? "99+" : item.badge}
          </span>
        )}
      </div>
      {isExpanded && (
        <span
          className={cn(
            "truncate transition-colors duration-150",
            isStudentVariant ? "text-sm font-medium" : "text-[13px] font-medium leading-tight"
          )}
        >
          {item.label}
        </span>
      )}
    </Link>
  );
}

export function LeftRail({
  session,
  currentPath = "/",
  viewMode,
  onViewModeChange,
}: LeftRailProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const isAdmin = session.user.role === "admin";

  const handleMouseEnter = useCallback(() => setIsExpanded(true), []);
  const handleMouseLeave = useCallback(() => setIsExpanded(false), []);

  const handleFocusIn = useCallback(() => setIsExpanded(true), []);
  const handleFocusOut = useCallback(() => setIsExpanded(false), []);

  const displayName = useMemo(() => {
    const trimmedName = session.user.name?.trim();
    return trimmedName?.length ? trimmedName : "LearningoPK";
  }, [session.user.name]);

  const truncatedName = useMemo(() => {
    return displayName.length > 20 ? displayName.slice(0, 20) + "..." : displayName;
  }, [displayName]);

  const avatarInitials = getInitials(displayName);

  const currentWidth = isExpanded ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH;

  const renderStudentNav = () => (
    <div className="flex w-full flex-col gap-1">
      {studentNavItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isNavItemActive(currentPath, item)}
          isExpanded={isExpanded}
          variant="student"
        />
      ))}
    </div>
  );

  const renderAdminNav = () => (
    <div className="flex w-full flex-col gap-1">
      {adminNavSections.map((section, sectionIndex) => (
        <div key={section.label}>
          {sectionIndex > 0 && (
            <div
              className={cn(
                "my-3 h-px bg-[var(--sidebar-border)]",
                !isExpanded ? "mx-auto w-8 opacity-30" : "w-full opacity-50"
              )}
            />
          )}
          {isExpanded && section.label && (
            <div className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-admin-default-text)] opacity-70">
              {section.label}
            </div>
          )}
          {section.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isNavItemActive(currentPath, item)}
              isExpanded={isExpanded}
              variant="admin"
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <div
      className="left-rail-container fixed inset-y-0 left-0 z-40 flex"
      style={{ width: currentWidth, transition: "width 350ms ease-in-out" }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onFocusCapture={handleFocusIn}
      onBlurCapture={handleFocusOut}
    >
      <aside
        className={cn(
          "flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]",
          "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.08)]",
          "h-full w-full"
        )}
        data-testid="left-rail"
        data-expanded={isExpanded ? "true" : "false"}
        data-view-mode={viewMode}
      >
        <div className="flex flex-1 flex-col px-[var(--sidebar-padding-x)] py-[var(--sidebar-padding-top)]">
          <div
            className={cn(
              "mb-4 flex items-center",
              !isExpanded ? "justify-center" : "gap-3"
            )}
          >
            <Link
              href="/dashboard"
              aria-label="LearningoPK Home"
              className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-[var(--foreground)] p-2 shadow-md transition-all duration-200 hover:shadow-lg hover:scale-105"
            >
              <Image
                src="/new_logo.png"
                alt="LearningoPK logo"
                width={28}
                height={28}
                className="h-7 w-7 rounded-lg object-cover invert"
                priority
              />
            </Link>
            {isExpanded && (
              <div className="flex flex-col min-w-0">
                <span className="truncate text-base font-semibold text-[var(--sidebar-brand-text)] tracking-tight">
                  LearningoPK
                </span>
                <span className="truncate text-xs text-[var(--sidebar-brand-text-muted)]">
                  Welcome back
                </span>
              </div>
            )}
          </div>

          {isAdmin && isExpanded && (
            <RoleToggle
              currentMode={viewMode}
              onModeChange={onViewModeChange}
            />
          )}

          <div className="flex-1">
            {viewMode === "student" ? renderStudentNav() : renderAdminNav()}
          </div>
        </div>

        <div className="shrink-0 px-[var(--sidebar-padding-x)] py-4 space-y-1">
          <ThemeToggleCompact isCollapsed={!isExpanded} />

          <LogoutButton
            ariaLabel="Sign out"
            icon={
              <SignOut
                className="h-5 w-5 shrink-0 transition-colors duration-150"
                aria-hidden
              />
            }
            hideLabel={!isExpanded}
            className={cn(
              "group flex h-10 w-full items-center rounded-xl border-0 bg-transparent transition-all duration-150",
              !isExpanded ? "justify-center text-[var(--sidebar-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8" : "gap-3 px-3 text-[var(--sidebar-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8"
            )}
            labelClassName="truncate text-sm font-medium transition-colors duration-150"
          />

          <Link
            href="/settings"
            aria-label={`Profile: ${displayName}`}
            title={!isExpanded ? displayName : undefined}
            className={cn(
              "group flex items-center rounded-2xl border border-[var(--sidebar-profile-border)] bg-[var(--sidebar-profile-bg)] p-3 transition-all duration-150 hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-nav-hover-bg)]",
              !isExpanded
                ? "justify-center p-2"
                : "gap-3"
            )}
          >
            <div className={cn(
              "flex shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-profile-avatar-bg)] text-[var(--sidebar-profile-avatar-text)] font-bold transition-all duration-150 group-hover:scale-105",
              !isExpanded ? "h-10 w-10 text-sm" : "h-10 w-10 text-sm"
            )}>
              {avatarInitials}
            </div>
            {isExpanded && (
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-[var(--sidebar-profile-text)]">
                  {truncatedName}
                </p>
                <p className="truncate text-xs text-[var(--sidebar-profile-text-muted)]">
                  View Profile
                </p>
              </div>
            )}
          </Link>
        </div>
      </aside>
    </div>
  );
}
