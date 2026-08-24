import type { HTMLAttributes, ReactNode } from "react";
import { Inbox } from "lucide-react";

import { cn } from "@/lib/utils";

/** Props for the EmptyState component. */
export interface EmptyStateProps extends HTMLAttributes<HTMLElement> {
  /** Icon rendered in the centered circle. Defaults to Inbox. */
  icon?: ReactNode;
  /** Primary heading text. */
  title: string;
  /** Supporting description text. */
  description?: string;
  /** Optional action element (e.g. a Button). */
  action?: ReactNode;
}

/**
 * Centered empty state placeholder with icon, title, description, and optional CTA.
 *
 * Uses Lucide icons by default.
 */
export function EmptyState({
  className,
  icon,
  title,
  description,
  action,
  ...props
}: EmptyStateProps) {
  return (
    <section
      className={cn(
        "flex flex-col items-center justify-center rounded-xl",
        "border border-dashed border-border-default bg-bg-subtle/40",
        "px-6 py-12 text-center",
        className
      )}
      {...props}
    >
      <div className="mb-4 inline-flex h-12 w-12 items-center justify-center rounded-full bg-bg-elevated text-text-muted">
        {icon ?? <Inbox className="h-6 w-6" aria-hidden />}
      </div>

      <h3 className="text-base font-semibold text-text-primary font-[var(--font-display)]">
        {title}
      </h3>

      {description ? (
        <p className="mt-1.5 max-w-sm text-sm text-text-secondary">{description}</p>
      ) : null}

      {action ? <div className="mt-5">{action}</div> : null}
    </section>
  );
}
