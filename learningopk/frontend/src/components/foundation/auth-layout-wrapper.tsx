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
    <div className="flex min-h-screen overflow-x-hidden">
      {/* Left Rail */}
      <LeftRail
        session={session}
        currentPath={currentPath}
        viewMode={viewMode}
        onViewModeChange={handleViewModeChange}
      />
      
      {/* Main content */}
      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 pb-16 pl-4 pr-4 md:pb-4",
          className
        )}
      >
        {children}
      </main>
    </div>
  );
}
