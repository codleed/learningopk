import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Inbox, LoaderCircle } from "lucide-react";

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
    <section
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-2xl border p-8 text-center transition-all duration-200",
        "border-destructive/30 bg-destructive/10",
        "hover:border-destructive/40 hover:bg-destructive/15",
        className
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-destructive/20 text-destructive">
        {icon ?? <AlertTriangle className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-destructive-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
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
  variant?: "default" | "card" | "list";
};

export function LoadingSkeleton({
  className,
  rows = 3,
  title = "Loading content",
  variant = "default"
}: LoadingSkeletonProps) {
  const containerClasses = {
    default: "surface-soft rounded-2xl border border-border p-6",
    card: "surface-card rounded-xl border border-border p-4",
    list: "flex flex-col gap-3",
  };

  return (
    <section
      className={cn(containerClasses[variant], className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
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

type SuccessStateProps = StateProps;

export function SuccessState({ title, description, action, className, icon }: SuccessStateProps) {
  return (
    <section className={cn("rounded-2xl border border-success/30 bg-success/10 p-8 text-center", className)}>
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-success/20 text-success">
        {icon ?? <CheckCircle className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-foreground">{title}</h3>
      {description ? <p className="mt-2 text-sm text-muted-foreground">{description}</p> : null}
      {action ? <div className="mt-4 flex items-center justify-center">{action}</div> : null}
    </section>
  );
}

type CardSkeletonProps = {
  count?: number;
  className?: string;
};

export function CardSkeleton({ count = 1, className }: CardSkeletonProps) {
  return (
    <div className={cn("grid gap-4", className)}>
      {Array.from({ length: count }).map((_, index) => (
        <div
          key={index}
          className="rounded-2xl border border-border p-5"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <div className="h-9 w-9 animate-pulse rounded-xl bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="h-6 w-12 animate-pulse rounded-full bg-muted" />
          </div>
          <div className="mt-4 space-y-2">
            <div className="h-4 w-3/4 animate-pulse rounded bg-muted" />
            <div className="h-4 w-1/2 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}

export function PageSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-6", className)}>
      <div className="space-y-2">
        <div className="h-4 w-32 animate-pulse rounded bg-muted" />
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
      </div>
      <div className="rounded-xl border border-border p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
              <div className="flex-1 space-y-2">
                <div className="h-3 w-3/4 animate-pulse rounded bg-muted" />
                <div className="h-3 w-1/2 animate-pulse rounded bg-muted" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export function ThreadSkeleton({ className }: { className?: string }) {
  return (
    <div className={cn("space-y-3", className)}>
      {Array.from({ length: 3 }).map((_, index) => (
        <div
          key={index}
          className="rounded-xl border border-border p-5"
        >
          <div className="flex flex-wrap items-center gap-2">
            <div className="h-5 w-16 animate-pulse rounded bg-muted" />
            <div className="h-5 w-20 animate-pulse rounded bg-muted" />
          </div>
          <div className="mt-2 h-6 w-3/4 animate-pulse rounded bg-muted" />
          <div className="mt-2 h-4 w-full animate-pulse rounded bg-muted" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            <div className="h-3 w-24 animate-pulse rounded bg-muted" />
            <div className="h-3 w-16 animate-pulse rounded bg-muted" />
          </div>
        </div>
      ))}
    </div>
  );
}
