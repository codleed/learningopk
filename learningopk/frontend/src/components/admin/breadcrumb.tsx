import type { ReactNode } from "react";
import { ChevronRight } from "lucide-react";

import { cn } from "@/lib/utils";

type BreadcrumbSegment = {
  label: string;
  href?: string;
};

type AdminBreadcrumbProps = {
  segments: BreadcrumbSegment[];
  className?: string;
};

export function AdminBreadcrumb({ segments, className }: AdminBreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn("flex items-center gap-1 text-sm", className)}>
      {segments.map((segment, index) => {
        const isLast = index === segments.length - 1;
        const content = (
          <>
            <span
              className={cn(
                "transition-colors",
                isLast ? "text-[var(--text-primary)]" : "text-[var(--text-secondary)]"
              )}
            >
              {segment.label}
            </span>
            {!isLast && (
              <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
            )}
          </>
        );

        if (isLast) {
          return (
            <span key={segment.label} aria-current="page">
              {content}
            </span>
          );
        }

        return (
          <span key={segment.label} className="flex items-center">
            {segment.href ? (
              <a
                href={segment.href}
                className="text-[var(--text-secondary)] transition-colors hover:text-[var(--text-primary)]"
              >
                {segment.label}
              </a>
            ) : (
              <span className="text-[var(--text-secondary)]">{segment.label}</span>
            )}
            <ChevronRight className="h-4 w-4 shrink-0 text-[var(--text-secondary)]" aria-hidden />
          </span>
        );
      })}
    </nav>
  );
}
