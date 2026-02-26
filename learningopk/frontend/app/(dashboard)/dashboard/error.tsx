"use client";

import { RouteError } from "@/components/foundation/route-state";

type DashboardErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardError({ error, reset }: DashboardErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Dashboard failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

