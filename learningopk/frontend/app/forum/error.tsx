"use client";

import { RouteError } from "@/components/foundation/route-state";

type ForumErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ForumError({ error, reset }: ForumErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Forum feed failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

