"use client";

import { useState, useCallback } from "react";
import type { ReactNode } from "react";

import { LeftRail } from "@/components/foundation/left-rail";
import type { SessionPayload } from "@/lib/session";
import { cn } from "@/lib/utils";

type AuthLayoutWrapperProps = {
  children: ReactNode;
  session: SessionPayload;
  currentPath?: string;
  className?: string;
};

const RAIL_COLLAPSED_WIDTH = "4.5rem";
const RAIL_EXPANDED_WIDTH = "15rem";
const RAIL_STORAGE_KEY = "learningo-sidebar-collapsed";

function getInitialCollapsedState(): boolean {
  if (typeof window === "undefined") return true;
  if (typeof localStorage === "undefined") return true;
  const stored = localStorage.getItem(RAIL_STORAGE_KEY);
  if (stored === null) return true;
  return stored === "true";
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
  const isHydrated = getInitialHydratedState();

  const handleToggle = useCallback(() => {
    setIsCollapsed((prev) => {
      const newValue = !prev;
      localStorage.setItem(RAIL_STORAGE_KEY, String(newValue));
      return newValue;
    });
  }, []);

  const sidebarWidth = isHydrated && !isCollapsed ? RAIL_EXPANDED_WIDTH : RAIL_COLLAPSED_WIDTH;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <LeftRail
        session={session}
        currentPath={currentPath}
        isCollapsed={!isHydrated ? true : isCollapsed}
        onToggle={handleToggle}
      />
      <main
        id="main-content"
        className={cn(
          "flex-1 min-w-0 transition-all duration-300 ease-in-out",
          className
        )}
        style={{ marginLeft: sidebarWidth }}
      >
        {children}
      </main>
    </div>
  );
}
