"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { AnimatePresence, motion } from "framer-motion";
import { Bell, ChevronRight, Menu } from "lucide-react";

import { cn } from "@/lib/utils";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Tooltip } from "@/components/ui/tooltip";
import { StreakCounter } from "@/components/common/streak-counter";
import {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  STORAGE_KEY,
  MOBILE_BREAKPOINT,
} from "@/components/layout/app-sidebar";

/* ═══════════════════════════════════════════
   Breadcrumb route map
   ═══════════════════════════════════════════ */

const routeLabelMap: Record<string, string> = {
  dashboard: "Dashboard",
  subjects: "Subjects",
  "past-papers": "Past Papers",
  "ai-tutor": "AI Tutor",
  stats: "Stats",
  forum: "Forum",
  settings: "Settings",
  admin: "Admin",
  users: "Users",
  content: "Content",
  moderation: "Moderation",
  community: "Community",
  analytics: "Analytics",
  audit: "Audit",
  notifications: "Notifications",
};

interface BreadcrumbSegment {
  label: string;
  href: string;
}

function buildBreadcrumbs(pathname: string): BreadcrumbSegment[] {
  const segments = pathname.split("/").filter(Boolean);
  if (segments.length === 0) return [];

  const crumbs: BreadcrumbSegment[] = [];
  let href = "";

  for (const segment of segments) {
    href += `/${segment}`;
    const label = routeLabelMap[segment] ?? segment.charAt(0).toUpperCase() + segment.slice(1).replace(/-/g, " ");
    crumbs.push({ label, href });
  }

  return crumbs;
}

/* ═══════════════════════════════════════════
   Breadcrumb component
   ═══════════════════════════════════════════ */

function Breadcrumbs({ pathname }: { pathname: string }) {
  const crumbs = useMemo(() => buildBreadcrumbs(pathname), [pathname]);

  if (crumbs.length === 0) return null;

  return (
    <nav aria-label="Breadcrumb" className="flex items-center gap-1 text-sm">
      <ol className="flex items-center gap-1">
        {crumbs.map((crumb, index) => {
          const isLast = index === crumbs.length - 1;

          return (
            <li key={crumb.href} className="flex items-center gap-1">
              {index > 0 && (
                <ChevronRight
                  className="h-3.5 w-3.5 text-text-muted"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              )}
              {isLast ? (
                <span
                  className="font-medium text-text-primary"
                  aria-current="page"
                >
                  {crumb.label}
                </span>
              ) : (
                <Link
                  href={crumb.href}
                  className="text-text-muted transition-colors duration-150 hover:text-text-primary"
                >
                  {crumb.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

/* ═══════════════════════════════════════════
   User dropdown
   ═══════════════════════════════════════════ */

interface UserDropdownProps {
  userName: string;
  userImage?: string | null;
}

function UserDropdown({ userName, userImage }: UserDropdownProps) {
  const [open, setOpen] = useState(false);

  /* Close on outside click */
  useEffect(() => {
    if (!open) return;
    const handleClick = () => setOpen(false);
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("click", handleClick);
    document.addEventListener("keydown", handleEscape);
    return () => {
      document.removeEventListener("click", handleClick);
      document.removeEventListener("keydown", handleEscape);
    };
  }, [open]);

  return (
    <div className="relative">
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((prev) => !prev);
        }}
        className={cn(
          "flex items-center gap-2 rounded-lg p-1.5 transition-colors duration-150",
          "hover:bg-bg-subtle",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
        )}
        aria-label="User menu"
        aria-expanded={open}
        aria-haspopup="true"
      >
        <Avatar src={userImage} name={userName} size="sm" />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: -4, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -4, scale: 0.95 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className={cn(
              "absolute right-0 top-full mt-2 z-50 w-56",
              "rounded-lg border border-border-default bg-bg-surface shadow-[var(--shadow-elevated)]",
              "overflow-hidden"
            )}
            role="menu"
            aria-label="User menu"
            onClick={(e) => e.stopPropagation()}
          >
            {/* User info */}
            <div className="border-b border-border-default px-4 py-3">
              <p className="truncate text-sm font-semibold text-text-primary">
                {userName}
              </p>
              <p className="truncate text-xs text-text-muted">
                View profile
              </p>
            </div>

            {/* Menu items */}
            <div className="p-1">
              <Link
                href="/settings"
                role="menuitem"
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                onClick={() => setOpen(false)}
              >
                Settings
              </Link>
              <Link
                href="/stats"
                role="menuitem"
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-text-secondary transition-colors hover:bg-bg-subtle hover:text-text-primary"
                onClick={() => setOpen(false)}
              >
                My Stats
              </Link>
            </div>

            {/* Logout */}
            <div className="border-t border-border-default p-1">
              <Link
                href="/api/auth/sign-out"
                role="menuitem"
                className="flex w-full items-center rounded-md px-3 py-2 text-sm text-accent-danger transition-colors hover:bg-accent-danger/10"
                onClick={() => setOpen(false)}
              >
                Sign out
              </Link>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/* ═══════════════════════════════════════════
   AppHeader — Main export
   ═══════════════════════════════════════════ */

export interface AppHeaderProps {
  /** Callback to toggle the mobile sidebar Sheet. */
  onMobileMenuToggle?: () => void;
  /** User display name. */
  userName?: string;
  /** User avatar image URL. */
  userImage?: string | null;
  /** Current streak count for StreakCounter. */
  streakCount?: number;
  /** Unread notification count. */
  notificationCount?: number;
}

export function AppHeader({
  onMobileMenuToggle,
  userName = "User",
  userImage,
  streakCount = 0,
  notificationCount = 0,
}: AppHeaderProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "/";

  /* ── Track sidebar collapsed state for left offset ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  useEffect(() => {
    /* Read initial state from localStorage */
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // localStorage unavailable
    }

    /* Listen for storage changes from the sidebar toggle */
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSidebarCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);

    /* Also poll localStorage since same-tab storage events don't fire */
    const interval = setInterval(() => {
      try {
        const value = localStorage.getItem(STORAGE_KEY) === "true";
        setSidebarCollapsed((prev) => (prev !== value ? value : prev));
      } catch {
        // ignore
      }
    }, 200);

    return () => {
      window.removeEventListener("storage", handleStorage);
      clearInterval(interval);
    };
  }, []);

  const sidebarOffset = isMobile
    ? 0
    : sidebarCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_WIDTH;

  return (
    <header
      data-testid="app-header"
      className={cn(
        "sticky top-0 z-50 flex h-[var(--header-height,60px)] items-center",
        "border-b border-border-default",
        "bg-bg-base/80 backdrop-blur-md",
        "transition-[left,padding] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
      )}
      style={{
        left: sidebarOffset,
        paddingLeft: isMobile ? 16 : 24,
        paddingRight: isMobile ? 16 : 24,
      }}
    >
      {/* ── Left: Mobile hamburger + Breadcrumbs ── */}
      <div className="flex items-center gap-3 min-w-0 flex-1">
        {/* Mobile hamburger */}
        {isMobile && (
          <button
            type="button"
            onClick={onMobileMenuToggle}
            className={cn(
              "flex h-9 w-9 items-center justify-center rounded-lg md:hidden",
              "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
            )}
            aria-label="Open navigation menu"
          >
            <Menu className="h-5 w-5" strokeWidth={1.5} />
          </button>
        )}

        {/* Breadcrumbs */}
        <Breadcrumbs pathname={currentPath} />
      </div>

      {/* ── Right: Actions ── */}
      <div className="flex items-center gap-2">
        {/* Streak counter */}
        <StreakCounter count={streakCount} size="sm" />

        {/* Notifications bell */}
        <Tooltip content="Notifications" side="bottom" delayDuration={300}>
          <Link
            href="/notifications"
            className={cn(
              "relative flex h-9 w-9 items-center justify-center rounded-lg",
              "text-text-secondary hover:bg-bg-subtle hover:text-text-primary",
              "transition-colors duration-150",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
            )}
            aria-label={`Notifications${notificationCount > 0 ? ` (${notificationCount} unread)` : ""}`}
          >
            <Bell className="h-5 w-5" strokeWidth={1.5} />
            {notificationCount > 0 && (
              <Badge
                variant="danger"
                size="sm"
                className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] flex items-center justify-center px-1 text-[10px] leading-none"
              >
                {notificationCount > 99 ? "99+" : notificationCount}
              </Badge>
            )}
          </Link>
        </Tooltip>

        {/* User avatar dropdown */}
        <UserDropdown userName={userName} userImage={userImage} />
      </div>
    </header>
  );
}
