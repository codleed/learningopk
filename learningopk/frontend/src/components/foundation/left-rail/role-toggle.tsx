"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleToggleProps } from "./left-rail-types";

export function RoleToggle({ currentMode, onModeChange, isExpanded = true }: RoleToggleProps) {
  if (!isExpanded) {
    const Icon = currentMode === "admin" ? ShieldCheck : GraduationCap;
    const nextMode: "admin" | "student" = currentMode === "admin" ? "student" : "admin";
    const NextIcon = nextMode === "admin" ? ShieldCheck : GraduationCap;

    return (
      <button
        onClick={() => onModeChange(nextMode)}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-xl",
          "bg-bg-subtle",
          "border border-border-default",
          "text-text-secondary",
          "hover:text-text-primary hover:bg-bg-elevated",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-primary/40"
        )}
        aria-label={`Switch to ${nextMode} view`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        <div className="absolute bottom-1 right-1">
          <NextIcon className="h-3 w-3 shrink-0 opacity-40" strokeWidth={2} />
        </div>
      </button>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Navigation view"
      className={cn(
        "relative mb-2 flex h-10 items-center rounded-lg",
        "bg-bg-subtle/60",
        "border border-border-default",
        "p-0.5 gap-0.5"
      )}
    >
      {/* Sliding indicator */}
      <div
        className={cn(
          "absolute top-0.5 h-[calc(100%-4px)] w-[calc(50%-2px)] rounded-md transition-all duration-200 ease-out",
          currentMode === "admin"
            ? "left-0.5 bg-accent-primary shadow-sm"
            : "left-[calc(50%+1px)] bg-accent-primary shadow-sm"
        )}
        aria-hidden
      />

      <button
        role="tab"
        aria-selected={currentMode === "admin"}
        tabIndex={currentMode === "admin" ? 0 : -1}
        onClick={() => onModeChange("admin")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5",
          "h-full rounded-md px-2",
          "text-xs font-medium transition-colors duration-150",
          currentMode === "admin" ? "text-white" : "text-text-muted hover:text-text-secondary",
          "focus-visible:outline-none"
        )}
      >
        <ShieldCheck
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={currentMode === "admin" ? 2.5 : 2}
        />
        <span className="truncate">Admin</span>
      </button>

      <button
        role="tab"
        aria-selected={currentMode === "student"}
        tabIndex={currentMode === "student" ? 0 : -1}
        onClick={() => onModeChange("student")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5",
          "h-full rounded-md px-2",
          "text-xs font-medium transition-colors duration-150",
          currentMode === "student" ? "text-white" : "text-text-muted hover:text-text-secondary",
          "focus-visible:outline-none"
        )}
      >
        <GraduationCap
          className="h-3.5 w-3.5 shrink-0"
          strokeWidth={currentMode === "student" ? 2.5 : 2}
        />
        <span className="truncate">Student</span>
      </button>
    </div>
  );
}
