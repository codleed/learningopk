import type { ReactNode } from "react";
import { AlertTriangle, Inbox, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type StateProps = {
  title: string;
  description?: string;
  action?: ReactNode;
  className?: string;
  icon?: ReactNode;
};

export function EmptyState({ title, description, action, className, icon }: StateProps) {
  return (
    <section className={cn("surface-soft rounded-2xl border border-dashed border-border p-8 text-center", className)}>
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex items-center justify-center">{action}</div> : null}
    </section>
  );
}

type ErrorStateProps = StateProps & {
  onRetry?: () => void;
  retryLabel?: string;
};

export function ErrorState({
  title,
  description,
  action,
  className,
  icon,
  onRetry,
  retryLabel = "Try again"
}: ErrorStateProps) {
  return (
    <section className={cn("rounded-2xl border border-red-200 bg-red-50/80 p-8 text-center", className)}>
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-red-100 text-red-700">
        {icon ?? <AlertTriangle className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-red-900">{title}</h3>
      {description ? <p className="mt-2 text-sm text-red-700">{description}</p> : null}
      <div className="mt-4 flex flex-wrap items-center justify-center gap-2">
        {onRetry ? (
          <Button type="button" variant="danger" size="sm" onClick={onRetry}>
            {retryLabel}
          </Button>
        ) : null}
        {action}
      </div>
    </section>
  );
}

type LoadingSkeletonProps = {
  className?: string;
  rows?: number;
  title?: string;
};

export function LoadingSkeleton({ className, rows = 3, title = "Loading content" }: LoadingSkeletonProps) {
  return (
    <section className={cn("surface-card rounded-2xl border border-border p-6", className)} aria-busy aria-live="polite">
      <p className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        <span>{title}</span>
      </p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_entry, index) => (
          <div
            key={index}
            className={cn(
              "h-3 animate-pulse rounded bg-muted",
              index === rows - 1 ? "w-2/3" : index % 2 === 0 ? "w-full" : "w-5/6"
            )}
          />
        ))}
      </div>
    </section>
  );
}

