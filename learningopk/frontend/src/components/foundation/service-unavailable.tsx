"use client";

import { RefreshCw, WifiOff } from "lucide-react";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

type ServiceUnavailableProps = {
  /** Primary heading shown to the user. */
  title?: string;
  /** Secondary description text. */
  description?: string;
  /** Callback invoked when the user clicks "Try again". */
  onRetry?: () => void;
  /** Label for the retry button. */
  retryLabel?: string;
  /** Additional wrapper classes. */
  className?: string;
};

/**
 * Full-page degraded-state component shown when the backend or auth service
 * is unreachable. Provides a clear message and a retry action so users
 * understand the outage is temporary and can recover without refreshing.
 */
export function ServiceUnavailable({
  title = "Service temporarily unavailable",
  description = "We\u2019re having trouble reaching our servers. Please check your connection and try again in a few minutes.",
  onRetry,
  retryLabel = "Try again",
  className,
}: ServiceUnavailableProps) {
  return (
    <section
      role="alert"
      aria-live="polite"
      className={cn(
        "mx-auto flex min-h-[60vh] max-w-lg flex-col items-center justify-center px-6 py-16 text-center",
        className,
      )}
    >
      {/* Icon */}
      <div className="mb-6 flex h-16 w-16 items-center justify-center rounded-2xl border border-border-default bg-bg-subtle text-text-secondary">
        <WifiOff className="h-8 w-8" aria-hidden />
      </div>

      {/* Heading */}
      <h1 className="text-2xl font-semibold tracking-tight text-text-primary sm:text-3xl">
        {title}
      </h1>

      {/* Description */}
      <p className="mt-3 max-w-md text-sm leading-relaxed text-text-secondary sm:text-base">
        {description}
      </p>

      {/* Retry button */}
      {onRetry ? (
        <div className="mt-8">
          <Button
            variant="primary"
            size="lg"
            onClick={onRetry}
            iconLeft={<RefreshCw />}
          >
            {retryLabel}
          </Button>
        </div>
      ) : null}

      {/* Status hint */}
      <p className="mt-6 text-xs text-text-muted">
        If this keeps happening, the service may be undergoing maintenance.
      </p>
    </section>
  );
}
