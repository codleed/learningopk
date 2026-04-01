"use client";

import { Menu, LogOut, X, type LucideIcon } from "lucide-react";
import Image from "next/image";
import Link from "next/link";
import { useMemo, useState, useCallback, useEffect, useRef } from "react";

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

const MOBILE_BREAKPOINT = 768;

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
  onNavigate?: () => void;
}

function NavItem({ item, isActive, isExpanded, variant, onNavigate }: NavItemProps) {
  const LinkIcon = item.icon as LucideIcon;
  const isStudentVariant = variant === "student";

  return (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      title={!isExpanded ? item.label : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center rounded-xl transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--sidebar)]",
        !isExpanded
          ? "h-11 w-11 justify-center mx-auto"
          : isStudentVariant
            ? "h-11 px-3"
            : "h-8 px-3",
        isStudentVariant
          ? isActive
            ? "bg-[var(--sidebar-nav-active-bg)] text-[var(--sidebar-nav-active-text)]"
            : "text-[var(--sidebar-nav-default-text)] hover:bg-[var(--sidebar-nav-hover-bg)] hover:text-[var(--sidebar-nav-hover-text)]"
          : isActive
            ? "bg-[var(--sidebar-admin-active-bg)] text-[var(--sidebar-admin-active-text)]"
            : "text-[var(--sidebar-admin-default-text)] hover:bg-[var(--sidebar-admin-hover-bg)] hover:text-[var(--sidebar-admin-hover-text)]"
      )}
    >
      <div className={cn("flex shrink-0", !isExpanded ? "justify-center" : "gap-3", isStudentVariant ? "w-11" : "w-[52px]")}>
        <LinkIcon
          className="h-5 w-5 shrink-0"
          strokeWidth={isActive ? 2.5 : 2}
          aria-hidden
        />
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
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const sidebarRef = useRef<HTMLDivElement>(null);
  const isAdmin = session.user.role === "admin";
  const suppressExpandRef = useRef(false);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth < MOBILE_BREAKPOINT;
      setIsMobile(mobile);
      if (mobile) {
        setIsExpanded(false);
      }
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    if (isMobile && isMobileOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "";
    }
    return () => {
      document.body.style.overflow = "";
    };
  }, [isMobile, isMobileOpen]);

  useEffect(() => {
    if (isMobile || !isMobileOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        setIsMobileOpen(false);
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile, isMobileOpen]);

  const actualExpanded = isMobile ? isMobileOpen : isExpanded;

  const handleMouseEnter = useCallback(() => {
    if (isMobile) return;
    if (suppressExpandRef.current) return;
    setIsExpanded(true);
  }, [isMobile]);

  const handleMouseLeave = useCallback(() => {
    if (isMobile) return;
    setIsExpanded(false);
    suppressExpandRef.current = false;
  }, [isMobile]);

  const handleNavItemClick = useCallback(() => {
    if (isMobile) {
      setIsMobileOpen(false);
    } else {
      setIsExpanded(false);
      suppressExpandRef.current = true;
    }
  }, [isMobile]);

  const handleMobileToggle = useCallback(() => {
    setIsMobileOpen((prev) => !prev);
  }, []);

  const handleMobileClose = useCallback(() => {
    setIsMobileOpen(false);
  }, []);

  const displayName = useMemo(() => {
    const trimmedName = session.user.name?.trim();
    return trimmedName?.length ? trimmedName : "LearningoPK";
  }, [session.user.name]);

  const truncatedName = useMemo(() => {
    return displayName.length > 20 ? displayName.slice(0, 20) + "..." : displayName;
  }, [displayName]);

  const avatarInitials = getInitials(displayName);

  const renderStudentNav = () => (
    <div className="flex w-full flex-col gap-1">
      {studentNavItems.map((item) => (
        <NavItem
          key={item.href}
          item={item}
          isActive={isNavItemActive(currentPath, item)}
          isExpanded={actualExpanded}
          variant="student"
          onNavigate={handleNavItemClick}
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
                !actualExpanded ? "mx-auto w-8 opacity-30" : "w-full opacity-50"
              )}
            />
          )}
          {actualExpanded && section.label && (
            <div className="mb-1 mt-3 px-3 text-[11px] font-semibold uppercase tracking-wider text-[var(--sidebar-admin-default-text)] opacity-70">
              {section.label}
            </div>
          )}
          {section.items.map((item) => (
            <NavItem
              key={item.href}
              item={item}
              isActive={isNavItemActive(currentPath, item)}
              isExpanded={actualExpanded}
              variant="admin"
              onNavigate={handleNavItemClick}
            />
          ))}
        </div>
      ))}
    </div>
  );

  return (
    <>
      {isMobile && (
        <button
          onClick={handleMobileToggle}
          className="fixed top-4 left-4 z-50 flex h-10 w-10 items-center justify-center rounded-lg bg-[var(--sidebar-bg)] border border-[var(--sidebar-border)] shadow-md hover:bg-[var(--sidebar-nav-hover-bg)] transition-colors md:hidden"
          aria-label="Open navigation menu"
          aria-expanded={isMobileOpen}
        >
          <Menu className="h-5 w-5 text-[var(--sidebar-nav-default-text)]" />
        </button>
      )}

      {isMobile && isMobileOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/50 md:hidden"
          onClick={handleMobileClose}
          aria-hidden="true"
        />
      )}
      
      <div
        ref={sidebarRef}
        className={cn(
          "left-rail-container fixed inset-y-0 left-0 z-40 flex",
          isMobile ? (
            isMobileOpen ? "translate-x-0" : "-translate-x-full"
          ) : (
            isExpanded ? "w-[280px]" : "w-[72px]"
          ),
          isMobile
            ? "transition-transform duration-300 ease-in-out"
            : "transition-[width] duration-300 ease-in-out"
        )}
        aria-expanded={isMobile ? isMobileOpen : isExpanded}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        <aside
          role="navigation"
          aria-label="Main sidebar"
          className={cn(
            "flex flex-col border-r border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]",
            "shadow-[0_4px_6px_-1px_rgba(0,0,0,0.05),0_10px_20px_-5px_rgba(0,0,0,0.08)]",
            "h-full w-full"
          )}
          data-testid="left-rail"
          data-expanded={actualExpanded ? "true" : "false"}
        >
          <div className="shrink-0 px-[var(--sidebar-padding-x)] pt-[var(--sidebar-padding-top)]">
            <div
              className={cn(
                "mb-4 flex items-center relative",
                !actualExpanded ? "justify-center" : "gap-3"
              )}
            >
              {isMobile && (
                <button
                  onClick={handleMobileClose}
                  className="absolute right-2 top-2 rounded-lg p-1.5 text-[var(--sidebar-nav-default-text)] hover:bg-[var(--sidebar-nav-hover-bg)]"
                  aria-label="Close sidebar"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
              <Link
                href="/dashboard"
                aria-label="LearningoPK Home"
                onClick={handleNavItemClick}
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
              {actualExpanded && (
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
          </div>

          {isAdmin && (
            <div className={cn("shrink-0", !actualExpanded ? "h-[52px] flex items-center justify-center" : "px-[var(--sidebar-padding-x)]")}>
              <RoleToggle
                currentMode={viewMode}
                onModeChange={onViewModeChange}
                isExpanded={actualExpanded}
              />
            </div>
          )}

          <div className="flex-1 px-[var(--sidebar-padding-x)]">
            <div className="flex items-center justify-center">
              {viewMode === "student" ? renderStudentNav() : renderAdminNav()}
            </div>
          </div>

          <div className="shrink-0 px-[var(--sidebar-padding-x)] py-4 space-y-1">
            <ThemeToggleCompact isCollapsed={!actualExpanded} />

            <LogoutButton
              ariaLabel="Sign out"
              icon={
                <LogOut
                  className="h-5 w-5 shrink-0 transition-colors duration-150"
                  aria-hidden
                />
              }
              hideLabel={!actualExpanded}
              className={cn(
                "group flex h-10 w-full items-center rounded-xl border-0 bg-transparent transition-all duration-150",
                !actualExpanded ? "justify-center text-[var(--sidebar-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8" : "gap-3 px-3 text-[var(--sidebar-utility-default-text)] hover:text-[var(--destructive)] hover:bg-[var(--destructive)]/8"
              )}
              labelClassName="truncate text-sm font-medium transition-colors duration-150"
            />

            <Link
              href="/settings"
              aria-label={`Profile: ${displayName}`}
              title={!actualExpanded ? displayName : undefined}
              onClick={handleNavItemClick}
              className={cn(
                "group flex items-center rounded-2xl border border-[var(--sidebar-profile-border)] bg-[var(--sidebar-profile-bg)] p-3 transition-all duration-150 hover:border-[var(--sidebar-border)] hover:bg-[var(--sidebar-nav-hover-bg)]",
                !actualExpanded
                  ? "justify-center p-2"
                  : "gap-3"
              )}
            >
              <div className={cn(
                "flex shrink-0 items-center justify-center rounded-full bg-[var(--sidebar-profile-avatar-bg)] text-[var(--sidebar-profile-avatar-text)] font-bold transition-all duration-150 group-hover:scale-105",
                !actualExpanded ? "h-10 w-10 text-sm" : "h-10 w-10 text-sm"
              )}>
                {avatarInitials}
              </div>
              {actualExpanded && (
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
    </>
  );
}