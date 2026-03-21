"use client";

import { useState, useCallback, useEffect } from "react";
import type { ReactNode } from "react";

import { LeftRail } from "@/components/foundation/left-rail";
import type { SessionPayload } from "@/lib/session";
import type { ViewMode } from "@/components/foundation/left-rail/left-rail-types";
import { cn } from "@/lib/utils";

type AuthLayoutWrapperProps = {
  children: ReactNode;
  session: SessionPayload;
  currentPath?: string;
  className?: string;
};

const RAIL_COLLAPSED_WIDTH = "72px";
const RAIL_EXPANDED_WIDTH = "280px";
const RAIL_STORAGE_KEY = "learningo-sidebar-collapsed";
const VIEW_MODE_STORAGE_KEY = "learningo-view-mode";

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(RAIL_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
}

function getInitialViewMode(isAdmin: boolean): ViewMode {
  if (!isAdmin) return "student";
  if (typeof window === "undefined") return "admin";
  if (typeof localStorage === "undefined") return "admin";
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === "admin" || stored === "student") return stored;
  return "admin";
}

function getInitialHydratedState(): boolean {
  return typeof window !== "undefined";
}

export function AuthLayoutWrapper({
  children,
  session,
  currentPath,
  className,
}: AuthLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(getInitialCollapsedState);
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const isAdmin = session.user.role === "admin";
    return isAdmin ? "admin" : "student";
  });
  const isHydrated = getInitialHydratedState();
  const isAdmin = session.user.role === "admin";

  useEffect(() => {
    setViewMode(getInitialViewMode(isAdmin));
  }, [isAdmin]);

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(RAIL_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  }, []);

  const sidebarWidth = isHydrated && !isCollapsed ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <LeftRail
        session={session}
        currentPath={currentPath}
        isCollapsed={!isHydrated ? true : isCollapsed}
        onToggle={handleToggle}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 transition-[margin] duration-350 ease-in-out",
          className
        )}
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}
