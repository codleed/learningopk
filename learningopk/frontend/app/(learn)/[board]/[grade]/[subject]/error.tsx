"use client";

import { RouteError } from "@/components/foundation/route-state";

type SubjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SubjectError({ error, reset }: SubjectErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Subject page failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

