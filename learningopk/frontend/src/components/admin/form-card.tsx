import type { ReactNode } from "react";

import { cn } from "@/lib/utils";

type AdminFormCardProps = {
  title?: string;
  children: ReactNode;
  className?: string;
};

export function AdminFormCard({ title, children, className }: AdminFormCardProps) {
  return (
    <div
      className={cn(
        "rounded-[var(--radius-lg)] bg-[var(--bg-surface)] shadow-[var(--shadow-sm)]",
        className
      )}
      style={{ padding: "var(--space-6)" }}
    >
      {title && (
        <h2
          className="mb-6 font-heading text-lg font-semibold text-[var(--text-primary)]"
          style={{ fontSize: "1.125rem" }}
        >
          {title}
        </h2>
      )}
      {children}
    </div>
  );
}
