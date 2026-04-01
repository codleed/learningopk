"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "framer-motion";

import { cn } from "@/lib/utils";
import {
  AppSidebar,
  SIDEBAR_WIDTH,
  SIDEBAR_COLLAPSED_WIDTH,
  STORAGE_KEY,
  MOBILE_BREAKPOINT,
} from "@/components/layout/app-sidebar";
import { AppHeader } from "@/components/layout/app-header";

/* ═══════════════════════════════════════════
   Page transition variants
   ═══════════════════════════════════════════ */

const pageTransitionVariants = {
  initial: {
    opacity: 0,
    y: 16,
  },
  animate: {
    opacity: 1,
    y: 0,
  },
  exit: {
    opacity: 0,
    y: -8,
  },
};

/* ═══════════════════════════════════════════
   AppLayout — Main export
   ═══════════════════════════════════════════ */

export interface AppLayoutProps {
  children: React.ReactNode;
  /** User display name. Passed to sidebar and header. */
  userName?: string;
  /** User avatar image URL. */
  userImage?: string | null;
  /** User level for XP bar in sidebar. */
  userLevel?: number;
  /** Current XP for XP bar in sidebar. */
  userXP?: number;
  /** Max XP for current level. */
  userMaxXP?: number;
  /** Current streak count. */
  streakCount?: number;
  /** Unread notification count. */
  notificationCount?: number;
}

export function AppLayout({
  children,
  userName = "User",
  userImage,
  userLevel = 1,
  userXP = 0,
  userMaxXP = 100,
  streakCount = 0,
  notificationCount = 0,
}: AppLayoutProps) {
  const pathname = usePathname();

  /* ── Track sidebar state for content offset ── */
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  /* ── Track mobile sidebar open state ── */
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  /* ── Detect mobile breakpoint ── */
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };
    checkMobile();
    window.addEventListener("resize", checkMobile);
    return () => window.removeEventListener("resize", checkMobile);
  }, []);

  /* ── Sync sidebar collapsed state ── */
  useEffect(() => {
    try {
      setSidebarCollapsed(localStorage.getItem(STORAGE_KEY) === "true");
    } catch {
      // localStorage unavailable
    }

    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY) {
        setSidebarCollapsed(e.newValue === "true");
      }
    };
    window.addEventListener("storage", handleStorage);

    /* Poll for same-tab changes since StorageEvent doesn't fire in same tab */
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

  /* ── Mobile menu toggle ── */
  const handleMobileMenuToggle = useCallback(() => {
    setMobileMenuOpen((prev) => !prev);
  }, []);

  const sidebarOffset = isMobile
    ? 0
    : sidebarCollapsed
      ? SIDEBAR_COLLAPSED_WIDTH
      : SIDEBAR_WIDTH;

  return (
    <div className="relative min-h-screen bg-bg-base">
      {/* Skip to content link */}
      <a
        href="#main-content"
        className={cn(
          "sr-only rounded-md bg-accent-primary px-3 py-2 text-sm font-semibold text-white",
          "focus:not-sr-only focus:absolute focus:left-4 focus:top-3 focus:z-[60]"
        )}
      >
        Skip to content
      </a>

      {/* ── Sidebar ── */}
      <AppSidebar
        userName={userName}
        userImage={userImage}
        userLevel={userLevel}
        userXP={userXP}
        userMaxXP={userMaxXP}
      />

      {/* ── Main wrapper — offset by sidebar width ── */}
      <div
        className="flex min-h-screen flex-col transition-[margin-left] duration-200 ease-[cubic-bezier(0.25,0.1,0.25,1)]"
        style={{ marginLeft: sidebarOffset }}
      >
        {/* ── Header ── */}
        <AppHeader
          onMobileMenuToggle={handleMobileMenuToggle}
          userName={userName}
          userImage={userImage}
          streakCount={streakCount}
          notificationCount={notificationCount}
        />

        {/* ── Content area ── */}
        <main
          id="main-content"
          className="flex-1"
        >
          <AnimatePresence mode="wait">
            <motion.div
              key={pathname}
              variants={pageTransitionVariants}
              initial="initial"
              animate="animate"
              exit="exit"
              transition={{
                duration: 0.25,
                ease: [0.25, 0.1, 0.25, 1],
              }}
              className="mx-auto w-full max-w-[var(--content-max-width,1280px)] px-[var(--space-6,24px)] py-[var(--space-6,24px)]"
            >
              {children}
            </motion.div>
          </AnimatePresence>
        </main>
      </div>
    </div>
  );
}
