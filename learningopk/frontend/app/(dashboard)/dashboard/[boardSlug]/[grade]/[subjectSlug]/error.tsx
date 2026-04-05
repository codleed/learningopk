"use client";

import { ServiceUnavailable } from "@/components/foundation/service-unavailable";
import { RouteError } from "@/components/foundation/route-state";
import { isAuthServiceUnavailable } from "@/lib/auth-errors";

type DashboardSubjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardSubjectError({ error, reset }: DashboardSubjectErrorProps) {
  if (isAuthServiceUnavailable(error)) {
    return (
      <div className="mx-auto w-full max-w-6xl px-6 py-10">
        <ServiceUnavailable onRetry={reset} />
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Subject progress failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}
