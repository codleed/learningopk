"use client";

import { GraduationCap, ShieldCheck } from "lucide-react";
import { cn } from "@/lib/utils";
import type { RoleToggleProps } from "./left-rail-types";

export function RoleToggle({
  currentMode,
  onModeChange,
  isExpanded = true,
}: RoleToggleProps) {
  if (!isExpanded) {
    const Icon = currentMode === "admin" ? ShieldCheck : GraduationCap;
    const nextMode: "admin" | "student" = currentMode === "admin" ? "student" : "admin";
    const NextIcon = nextMode === "admin" ? ShieldCheck : GraduationCap;

    return (
      <button
        onClick={() => onModeChange(nextMode)}
        className={cn(
          "relative flex h-11 w-11 items-center justify-center rounded-xl",
          "bg-[var(--role-toggle-bg)]",
          "border border-[var(--role-toggle-border)]",
          "text-[var(--role-toggle-tab-default-text)]",
          "hover:text-[var(--foreground)]",
          "transition-all duration-150",
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]"
        )}
        aria-label={`Switch to ${nextMode} view`}
      >
        <Icon className="h-5 w-5 shrink-0" strokeWidth={2} />
        <div className="absolute bottom-1 right-1">
          <NextIcon className="h-3 w-3 shrink-0 opacity-50" strokeWidth={2} />
        </div>
      </button>
    );
  }

  return (
    <div
      role="tablist"
      aria-label="Navigation view"
      className={cn(
        "relative mb-2 flex h-11 items-center rounded-xl",
        "bg-[var(--role-toggle-bg)]",
        "border border-[var(--role-toggle-border)]",
        "p-1 gap-1"
      )}
    >
      <button
        role="tab"
        aria-selected={currentMode === "admin"}
        tabIndex={currentMode === "admin" ? 0 : -1}
        onClick={() => onModeChange("admin")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5",
          "h-9 rounded-lg px-3",
          "text-[13px] font-medium transition-all duration-150",
          currentMode === "admin" && [
            "text-[var(--role-toggle-admin-active-text)]",
          ],
          currentMode !== "admin" && [
            "text-[var(--role-toggle-tab-default-text)]",
            "hover:text-[var(--foreground)]",
          ],
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]"
        )}
      >
        <ShieldCheck
          className="h-4 w-4 shrink-0"
          strokeWidth={currentMode === "admin" ? 2.5 : 2}
        />
        <span>Admin</span>
      </button>

      <button
        role="tab"
        aria-selected={currentMode === "student"}
        tabIndex={currentMode === "student" ? 0 : -1}
        onClick={() => onModeChange("student")}
        className={cn(
          "relative z-10 flex flex-1 items-center justify-center gap-1.5",
          "h-9 rounded-lg px-3",
          "text-[13px] font-medium transition-all duration-150",
          currentMode === "student" && [
            "text-[var(--role-toggle-student-active-text)]",
          ],
          currentMode !== "student" && [
            "text-[var(--role-toggle-tab-default-text)]",
            "hover:text-[var(--foreground)]",
          ],
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--sidebar-ring)]"
        )}
      >
        <GraduationCap
          className="h-4 w-4 shrink-0"
          strokeWidth={currentMode === "student" ? 2.5 : 2}
        />
        <span>Student</span>
      </button>

      {currentMode === "admin" && (
        <div
          className="absolute left-1 top-1 h-9 w-[calc(50%-4px)] rounded-lg bg-[var(--role-toggle-admin-active-bg)] transition-all duration-200"
          aria-hidden
        />
      )}
      {currentMode === "student" && (
        <div
          className="absolute left-1 top-1 h-9 w-[calc(50%-4px)] rounded-lg bg-[var(--role-toggle-student-active-bg)] transition-all duration-200"
          style={{ left: "calc(50%)" }}
          aria-hidden
        />
      )}
    </div>
  );
}
