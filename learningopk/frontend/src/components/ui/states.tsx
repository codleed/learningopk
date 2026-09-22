import type { ReactNode } from "react";
import { AlertTriangle, CheckCircle, Inbox, LoaderCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
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
    <section
      className={cn(
        "rounded-[12px] border border-dashed border-hairline bg-paper-dim/40 p-8 text-center",
        className
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[8px] bg-paper-dim text-ink-faint">
        {icon ?? <Inbox className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
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
  retryLabel = "Try again",
}: ErrorStateProps) {
  return (
    <section
      role="alert"
      aria-live="polite"
      className={cn(
        "rounded-[12px] border border-hairline border-l-4 border-l-danger bg-danger-tint p-8 text-center",
        className
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[8px] bg-paper-dim text-danger">
        {icon ?? <AlertTriangle className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-danger">{title}</h3>
      {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
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
  variant = "default",
}: LoadingSkeletonProps) {
  const containerClasses = {
    default: "rounded-[12px] border border-hairline bg-paper-dim p-6",
    card: "rounded-[12px] border border-hairline bg-paper-dim p-4",
    list: "flex flex-col gap-3",
  };

  return (
    <section
      className={cn(containerClasses[variant], className)}
      aria-busy="true"
      aria-live="polite"
      aria-label={title}
    >
      <p className="mb-4 flex items-center gap-2 text-sm text-ink-faint">
        <LoaderCircle className="h-4 w-4 animate-spin" aria-hidden />
        <span>{title}</span>
      </p>
      <div className="space-y-3">
        {Array.from({ length: rows }).map((_entry, index) => (
          <Skeleton
            key={index}
            className={cn(index === rows - 1 ? "w-2/3" : index % 2 === 0 ? "w-full" : "w-5/6")}
          />
        ))}
      </div>
    </section>
  );
}

type SuccessStateProps = StateProps;

export function SuccessState({ title, description, action, className, icon }: SuccessStateProps) {
  return (
    <section
      className={cn(
        "rounded-[12px] border border-hairline border-l-4 border-l-accent bg-accent-tint p-8 text-center",
        className
      )}
    >
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-[8px] bg-paper-dim text-accent-bright">
        {icon ?? <CheckCircle className="h-5 w-5" aria-hidden />}
      </div>
      <h3 className="text-lg font-semibold text-ink">{title}</h3>
      {description ? <p className="mt-2 text-sm text-ink-soft">{description}</p> : null}
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
        <div key={index} className="rounded-[12px] border border-hairline bg-paper-dim p-5">
          <div className="flex items-start justify-between">
            <div className="flex items-center gap-2">
              <Skeleton className="h-9 w-9 rounded-[8px]" />
              <Skeleton className="h-3 w-20" />
            </div>
            <Skeleton className="h-6 w-12" />
          </div>
          <div className="mt-4 space-y-2">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="mt-4 flex items-center justify-between">
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-6 w-6" />
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
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-8 w-64" />
      </div>
      <div className="rounded-[12px] border border-hairline bg-paper-dim p-6">
        <div className="space-y-4">
          {Array.from({ length: 5 }).map((_, index) => (
            <div key={index} className="flex items-center gap-4">
              <Skeleton className="h-10 w-10 rounded-[8px]" />
              <div className="flex-1 space-y-2">
                <Skeleton className="h-3 w-3/4" />
                <Skeleton className="h-3 w-1/2" />
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
        <div key={index} className="rounded-[12px] border border-hairline bg-paper-dim p-5">
          <div className="flex flex-wrap items-center gap-2">
            <Skeleton className="h-5 w-16" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="mt-2 h-6 w-3/4" />
          <Skeleton className="mt-2 h-4 w-full" />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <Skeleton className="h-3 w-20" />
            <Skeleton className="h-3 w-24" />
            <Skeleton className="h-3 w-16" />
          </div>
        </div>
      ))}
    </div>
  );
}
