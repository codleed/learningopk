"use client";

import { RouteError } from "@/components/foundation/route-state";

type AITutorErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AITutorError({ error, reset }: AITutorErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="AI Tutor failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}
