"use client";

import { RouteError } from "@/components/foundation/route-state";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error, reset }: AdminErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Admin page failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

