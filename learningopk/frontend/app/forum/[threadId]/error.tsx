"use client";

import { RouteError } from "@/components/foundation/route-state";

type ForumThreadErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ForumThreadError({ error, reset }: ForumThreadErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <RouteError title="Thread failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

