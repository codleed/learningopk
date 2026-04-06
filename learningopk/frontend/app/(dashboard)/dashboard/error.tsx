"use client";

import { ServiceUnavailable } from "@/components/foundation/service-unavailable";
import { RouteError } from "@/components/foundation/route-state";
import { isAuthServiceUnavailable } from "@/lib/auth-errors";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  if (isAuthServiceUnavailable(error)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <ServiceUnavailable onRetry={reset} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Dashboard failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}
