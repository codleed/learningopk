import type { ReactNode } from "react";
import Link from "next/link";

import { cn } from "@/lib/utils";

type QuickAction = {
  label: string;
  description: string;
  href: string;
  icon?: ReactNode;
};

type AdminQuickActionsProps = {
  actions: QuickAction[];
  className?: string;
};

export function AdminQuickActions({ actions, className }: AdminQuickActionsProps) {
  return (
    <div
      className={cn(
        "grid gap-[var(--space-6)]",
        "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        className
      )}
    >
      {actions.map((action, index) => (
        <Link
          key={index}
          href={action.href}
          className="group block rounded-[var(--radius-lg)] bg-[var(--bg-surface)] border border-[var(--border-default)] p-[var(--space-6)] transition-all duration-200 hover:border-[var(--primary)] hover:shadow-[var(--shadow-md)]"
        >
          <div className="flex flex-col gap-[var(--space-3)]">
            {action.icon && (
              <span
                className="text-[var(--primary)] transition-transform duration-200 group-hover:scale-110"
                aria-hidden
              >
                {action.icon}
              </span>
            )}
            <h3 className="font-heading font-semibold text-[var(--text-primary)]" style={{ fontSize: "1rem" }}>
              {action.label}
            </h3>
            <p className="text-sm text-[var(--text-secondary)]">
              {action.description}
            </p>
          </div>
        </Link>
      ))}
    </div>
  );
}
