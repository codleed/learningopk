"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";
import {
  BookOpen,
  Bot,
  ChartPie,
  ChevronLeft,
  Files,
  House,
  MessageCircle,
  Settings,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";
import { ThemeToggleCompact } from "@/components/ui/theme-toggle";
import { Tooltip } from "@/components/ui/tooltip";
import { Avatar } from "@/components/ui/avatar";
import { XPBar } from "@/components/common/xp-bar";
import { Sheet, SheetBody, SheetHeader, SheetTitle } from "@/components/ui/sheet";

/* ═══════════════════════════════════════════
   Constants
   ═══════════════════════════════════════════ */

const SIDEBAR_WIDTH = 240;
const SIDEBAR_COLLAPSED_WIDTH = 64;
const STORAGE_KEY = "sidebar-collapsed";
const MOBILE_BREAKPOINT = 768;

/* ═══════════════════════════════════════════
   Navigation items — mirrors left-rail-config
   ═══════════════════════════════════════════ */

interface NavItem {
  href: string;
  label: string;
  icon: LucideIcon;
  matchers?: string[];
}

const mainNavItems: NavItem[] = [
  { href: "/dashboard", label: "Dashboard", icon: House },
  { href: "/subjects", label: "Subjects", icon: BookOpen },
  { href: "/past-papers", label: "Past Papers", icon: Files },
  { href: "/ai-tutor", label: "AI Tutor", icon: Bot },
  { href: "/stats", label: "Stats", icon: ChartPie },
  { href: "/forum", label: "Forum", icon: MessageCircle },
];

const bottomNavItems: NavItem[] = [
  { href: "/settings", label: "Settings", icon: Settings },
];

/** Check if a path matches a nav item (exact or prefix). */
function isNavItemActive(currentPath: string, item: NavItem): boolean {
  if (item.matchers) {
    return item.matchers.some(
      (m) => currentPath === m || currentPath.startsWith(`${m}/`)
    );
  }
  return currentPath === item.href || currentPath.startsWith(`${item.href}/`);
}

/* ═══════════════════════════════════════════
   Sidebar context — shared between desktop & mobile
   ═══════════════════════════════════════════ */

interface SidebarContextValue {
  collapsed: boolean;
  toggle: () => void;
  isMobile: boolean;
  mobileOpen: boolean;
  setMobileOpen: (open: boolean) => void;
}

/* ═══════════════════════════════════════════
   NavLink component
   ═══════════════════════════════════════════ */

interface NavLinkProps {
  item: NavItem;
  isActive: boolean;
  collapsed: boolean;
  onNavigate?: () => void;
}

function NavLink({ item, isActive, collapsed, onNavigate }: NavLinkProps) {
  const Icon = item.icon;

  const linkContent = (
    <Link
      href={item.href}
      aria-current={isActive ? "page" : undefined}
      onClick={onNavigate}
      className={cn(
        "group relative flex items-center gap-3 rounded-lg transition-all duration-150",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40 focus-visible:ring-offset-2 focus-visible:ring-offset-bg-base",
        collapsed ? "h-10 w-10 justify-center mx-auto" : "h-10 px-3",
        isActive
          ? "bg-bg-subtle text-accent-primary"
          : "text-text-secondary hover:bg-bg-subtle hover:text-text-primary"
      )}
    >
      {/* Active indicator — left border */}
      {isActive && (
        <motion.span
          layoutId="sidebar-active-indicator"
          className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-r-full bg-accent-primary"
          transition={{ type: "spring", stiffness: 350, damping: 30 }}
        />
      )}

      <Icon
        className="h-5 w-5 shrink-0"
        strokeWidth={1.5}
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        {!collapsed && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.15, ease: "easeOut" }}
            className="truncate text-sm font-medium"
          >
            {item.label}
          </motion.span>
        )}
      </AnimatePresence>
    </Link>
  );

  // Show tooltip only when collapsed on desktop
  if (collapsed) {
    return (
      <Tooltip content={item.label} side="right" delayDuration={200}>
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}

/* ═══════════════════════════════════════════
   SidebarContent — shared between desktop sidebar & mobile sheet
   ═══════════════════════════════════════════ */

interface SidebarContentProps {
  collapsed: boolean;
  currentPath: string;
  onToggle?: () => void;
  onNavigate?: () => void;
  userName?: string;
  userImage?: string | null;
  userLevel?: number;
  userXP?: number;
  userMaxXP?: number;
}

function SidebarContent({
  collapsed,
  currentPath,
  onToggle,
  onNavigate,
  userName = "User",
  userImage,
  userLevel = 1,
  userXP = 0,
  userMaxXP = 100,
}: SidebarContentProps) {
  return (
    <div className="flex h-full flex-col">
      {/* ── Logo ── */}
      <div className={cn("shrink-0 px-3 pt-4 pb-2", collapsed && "px-2")}>
        <div
          className={cn(
            "flex items-center",
            collapsed ? "justify-center" : "gap-3 px-1"
          )}
        >
          <Link
            href="/dashboard"
            aria-label="LearningoPK Home"
            onClick={onNavigate}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-accent-primary shadow-sm transition-transform duration-150 hover:scale-105"
          >
            <Image
              src="/new_logo.png"
              alt="LearningoPK logo"
              width={22}
              height={22}
              className="h-[22px] w-[22px] rounded object-cover invert"
              priority
            />
          </Link>

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.span
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -8 }}
                transition={{ duration: 0.15 }}
                className="text-base font-semibold tracking-tight text-text-primary select-none"
              >
                LearningoPK
              </motion.span>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* ── Collapse toggle button (desktop only) ── */}
      {onToggle && (
        <div className={cn("shrink-0 px-3 pb-1", collapsed && "px-2")}>
          <Tooltip
            content={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            side="right"
            delayDuration={300}
          >
            <button
              type="button"
              onClick={onToggle}
              className={cn(
                "flex h-8 items-center gap-2 rounded-md text-text-muted transition-colors duration-150",
                "hover:bg-bg-subtle hover:text-text-primary",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
                collapsed ? "w-8 justify-center mx-auto" : "w-full px-2"
              )}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            >
              <motion.span
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                <ChevronLeft className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </motion.span>
              <AnimatePresence mode="wait">
                {!collapsed && (
                  <motion.span
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.1 }}
                    className="text-xs font-medium"
                  >
                    Collapse
                  </motion.span>
                )}
              </AnimatePresence>
            </button>
          </Tooltip>
        </div>
      )}

      {/* ── Separator ── */}
      <div className={cn("mx-3 my-1 h-px bg-border-default", collapsed && "mx-2")} />

      {/* ── Main navigation ── */}
      <nav
        aria-label="Main navigation"
        className={cn("flex-1 overflow-y-auto px-3 py-2", collapsed && "px-2")}
      >
        <ul className="flex flex-col gap-0.5" role="list">
          {mainNavItems.map((item) => (
            <li key={item.href}>
              <NavLink
                item={item}
                isActive={isNavItemActive(currentPath, item)}
                collapsed={collapsed}
                onNavigate={onNavigate}
              />
            </li>
          ))}
        </ul>
      </nav>

      {/* ── Bottom section ── */}
      <div className={cn("shrink-0 px-3 pb-3 space-y-1", collapsed && "px-2")}>
        {/* Separator */}
        <div className={cn("mx-0 mb-1 h-px bg-border-default")} />

        {/* Bottom nav items (Settings) */}
        {bottomNavItems.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            isActive={isNavItemActive(currentPath, item)}
            collapsed={collapsed}
            onNavigate={onNavigate}
          />
        ))}

        {/* Theme toggle */}
        <div className={cn("flex", collapsed ? "justify-center" : "px-1")}>
          <ThemeToggleCompact isCollapsed={collapsed} />
        </div>

        {/* User profile card */}
        <Link
          href="/settings"
          onClick={onNavigate}
          className={cn(
            "group flex items-center rounded-lg border border-border-default bg-bg-surface p-2 transition-all duration-150",
            "hover:border-border-strong hover:bg-bg-elevated",
            "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40",
            collapsed ? "justify-center" : "gap-3"
          )}
          aria-label={`Profile: ${userName}`}
          title={collapsed ? userName : undefined}
        >
          <Avatar
            src={userImage}
            name={userName}
            size="sm"
          />

          <AnimatePresence mode="wait">
            {!collapsed && (
              <motion.div
                initial={{ opacity: 0, width: 0 }}
                animate={{ opacity: 1, width: "auto" }}
                exit={{ opacity: 0, width: 0 }}
                transition={{ duration: 0.15 }}
                className="min-w-0 flex-1"
              >
                <p className="truncate text-sm font-semibold text-text-primary">
                  {userName.length > 18 ? `${userName.slice(0, 18)}...` : userName}
                </p>
                <XPBar
                  currentXP={userXP}
                  maxXP={userMaxXP}
                  level={userLevel}
                  className="mt-1 [&>span]:hidden [&>div:first-child]:hidden [&>span:first-of-type]:hidden"
                />
              </motion.div>
            )}
          </AnimatePresence>
        </Link>
      </div>
    </div>
  );
}

/* ═══════════════════════════════════════════
   MobileSidebar — Sheet-based sidebar for < md
   ═══════════════════════════════════════════ */

interface MobileSidebarProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  currentPath: string;
  userName?: string;
  userImage?: string | null;
  userLevel?: number;
  userXP?: number;
  userMaxXP?: number;
}

function MobileSidebar({
  open,
  onOpenChange,
  currentPath,
  userName,
  userImage,
  userLevel,
  userXP,
  userMaxXP,
}: MobileSidebarProps) {
  const handleNavigate = useCallback(() => {
    onOpenChange(false);
  }, [onOpenChange]);

  return (
    <Sheet
      open={open}
      onOpenChange={onOpenChange}
      side="left"
      className="w-[280px] max-w-[85vw] p-0"
      showClose={false}
    >
      <SheetHeader className="sr-only">
        <SheetTitle>Navigation menu</SheetTitle>
      </SheetHeader>
      <SheetBody className="p-0 overflow-y-auto">
        <SidebarContent
          collapsed={false}
          currentPath={currentPath}
          onNavigate={handleNavigate}
          userName={userName}
          userImage={userImage}
          userLevel={userLevel}
          userXP={userXP}
          userMaxXP={userMaxXP}
        />
      </SheetBody>
    </Sheet>
  );
}

/* ═══════════════════════════════════════════
   AppSidebar — Main export
   ═══════════════════════════════════════════ */

export interface AppSidebarProps {
  /** User display name shown in the profile card. */
  userName?: string;
  /** User avatar URL. Falls back to initials. */
  userImage?: string | null;
  /** User level for XP bar. */
  userLevel?: number;
  /** Current XP for XP bar. */
  userXP?: number;
  /** Max XP for current level. */
  userMaxXP?: number;
}

export function AppSidebar({
  userName = "User",
  userImage,
  userLevel = 1,
  userXP = 0,
  userMaxXP = 100,
}: AppSidebarProps) {
  const pathname = usePathname();
  const currentPath = pathname ?? "/";

  /* ── Collapsed state with localStorage persistence ── */
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    try {
      return localStorage.getItem(STORAGE_KEY) === "true";
    } catch {
      return false;
    }
  });

  /* ── Mobile state ── */
  const [isMobile, setIsMobile] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);

  /* ── Detect mobile breakpoint ── */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── Persist collapsed state ── */
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, String(collapsed));
    } catch {
      // localStorage unavailable
    }
  }, [collapsed]);

  /* ── Keyboard shortcut: Cmd+B / Ctrl+B ── */
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "b") {
        e.preventDefault();
        if (isMobile) {
          setMobileOpen((prev) => !prev);
        } else {
          setCollapsed((prev) => !prev);
        }
      }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [isMobile]);

  const handleToggle = useCallback(() => {
    setCollapsed((prev) => !prev);
  }, []);

  const handleMobileOpenChange = useCallback((open: boolean) => {
    setMobileOpen(open);
  }, []);

  /* ── Mobile: render Sheet ── */
  if (isMobile) {
    return (
      <MobileSidebar
        open={mobileOpen}
        onOpenChange={handleMobileOpenChange}
        currentPath={currentPath}
        userName={userName}
        userImage={userImage}
        userLevel={userLevel}
        userXP={userXP}
        userMaxXP={userMaxXP}
      />
    );
  }

  /* ── Desktop: fixed sidebar ── */
  return (
    <motion.aside
      role="navigation"
      aria-label="Main sidebar"
      data-testid="app-sidebar"
      data-collapsed={collapsed ? "true" : "false"}
      className={cn(
        "fixed inset-y-0 left-0 z-40 flex flex-col",
        "border-r border-border-default bg-bg-surface",
        "shadow-[0_1px_3px_0_rgba(0,0,0,0.04)]"
      )}
      initial={false}
      animate={{
        width: collapsed ? SIDEBAR_COLLAPSED_WIDTH : SIDEBAR_WIDTH,
      }}
      transition={{
        duration: 0.2,
        ease: [0.25, 0.1, 0.25, 1],
      }}
    >
      <SidebarContent
        collapsed={collapsed}
        currentPath={currentPath}
        onToggle={handleToggle}
        userName={userName}
        userImage={userImage}
        userLevel={userLevel}
        userXP={userXP}
        userMaxXP={userMaxXP}
      />
    </motion.aside>
  );
}

/* ═══════════════════════════════════════════
   Re-exports for use in AppHeader / AppLayout
   ═══════════════════════════════════════════ */

export {
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  STORAGE_KEY,
  MOBILE_BREAKPOINT,
  mainNavItems,
  bottomNavItems,
  isNavItemActive,
};

export type { NavItem };
