"use client";

import type { ReactNode } from "react";

type TabButtonProps = {
  testId: string;
  isActive: boolean;
  onClick: () => void;
  children: ReactNode;
};

const TAB_BUTTON_BASE_CLASSES = "rounded-lg border px-3 py-1.5 text-sm font-medium transition";

export function TabButton({ testId, isActive, onClick, children }: TabButtonProps) {
  return (
    <button
      type="button"
      data-testid={testId}
      onClick={onClick}
      className={`${TAB_BUTTON_BASE_CLASSES} ${
        isActive
          ? "border-[var(--primary)] bg-[var(--primary)] text-[var(--primary-foreground)]"
          : "border-border-default bg-bg-surface text-text-primary hover:border-[var(--primary)]/40"
      }`}
    >
      {children}
    </button>
  );
}
