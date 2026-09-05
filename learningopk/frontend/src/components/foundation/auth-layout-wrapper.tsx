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

const VIEW_MODE_STORAGE_KEY = "learningo-view-mode";

/** Width of the collapsed LeftRail on desktop (matches left-rail.tsx) */
const LEFT_RAIL_COLLAPSED_WIDTH = 72;

function getInitialViewMode(isAdmin: boolean): ViewMode {
  if (!isAdmin) return "student";
  if (typeof window === "undefined") return "admin";
  if (typeof localStorage === "undefined") return "admin";
  const stored = localStorage.getItem(VIEW_MODE_STORAGE_KEY);
  if (stored === "admin" || stored === "student") return stored;
  return "admin";
}

export function AuthLayoutWrapper({
  children,
  session,
  currentPath,
  className,
}: AuthLayoutWrapperProps) {
  const [viewMode, setViewMode] = useState<ViewMode>(() => {
    const isAdmin = session.user.role === "admin";
    return isAdmin ? "admin" : "student";
  });
  const isAdmin = session.user.role === "admin";

  useEffect(() => {
    setViewMode(getInitialViewMode(isAdmin));
  }, [isAdmin]);

  const handleViewModeChange = useCallback((mode: ViewMode) => {
    setViewMode(mode);
    if (typeof window !== "undefined" && typeof localStorage !== "undefined") {
      localStorage.setItem(VIEW_MODE_STORAGE_KEY, mode);
    }
  }, []);

  return (
    <div className="relative min-h-screen">
      {/* Left Rail — fixed positioned sidebar */}
      <LeftRail
        session={session}
        currentPath={currentPath}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />

      {/*
       * Main content — offset by sidebar width on desktop.
       * Uses both margin-left AND width: calc(100% - rail) so the element
       * never exceeds the viewport (fixes the 72 px horizontal-overflow bug).
       *
       * Structural padding (pt-14 for mobile hamburger clearance) lives on
       * <main> so page-level `className` cannot accidentally override it.
       * Content padding lives on the inner <div>.
       */}
      <main
        id="main-content"
        className={cn(
          "min-h-screen min-w-0 pt-14 md:pt-0",
          "transition-[margin-left,width] duration-300 ease-in-out"
        )}
        style={{
          marginLeft: `var(--left-rail-width, ${LEFT_RAIL_COLLAPSED_WIDTH}px)`,
          width: `calc(100% - var(--left-rail-width, ${LEFT_RAIL_COLLAPSED_WIDTH}px))`,
        }}
      >
        <div className={cn("pb-16 md:pb-4", className)}>{children}</div>
      </main>
    </div>
  );
}
