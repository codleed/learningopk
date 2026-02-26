"use client";

import { RouteError } from "@/components/foundation/route-state";

type DashboardSubjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function DashboardSubjectError({ error, reset }: DashboardSubjectErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Subject progress failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

