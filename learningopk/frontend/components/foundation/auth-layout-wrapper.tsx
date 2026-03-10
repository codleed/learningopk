"use client";

import { useState } from "react";
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

export function AuthLayoutWrapper({
  children,
  session,
  currentPath,
  className,
}: AuthLayoutWrapperProps) {
  const [isCollapsed, setIsCollapsed] = useState(true);

  return (
    <>
      <LeftRail
        session={session}
        currentPath={currentPath}
        isCollapsed={isCollapsed}
        onToggle={() => setIsCollapsed((prev) => !prev)}
      />
      <main
        id="main-content"
        className={cn(
          "min-w-0 mr-auto transition-[margin] duration-300 ease-in-out",
          isCollapsed ? "ml-[4.5rem]" : "ml-[15rem]",
          className
        )}
      >
        {children}
      </main>
    </>
  );
}
