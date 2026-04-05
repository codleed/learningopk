"use client";

import { ServiceUnavailable } from "@/components/foundation/service-unavailable";
import { RouteError } from "@/components/foundation/route-state";
import { isAuthServiceUnavailable } from "@/lib/auth-errors";

type DashboardGroupErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

/**
 * Error boundary for the entire `(dashboard)` route group.
 *
 * - Auth / backend outage  → user-friendly "service unavailable" page with retry
 * - Everything else        → generic route-error fallback
 */
export default function DashboardGroupError({ error, reset }: DashboardGroupErrorProps) {
  if (isAuthServiceUnavailable(error)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <ServiceUnavailable onRetry={reset} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError
        title="Something went wrong"
        description={error.message}
        onRetry={reset}
      />
    </div>
  );
}
