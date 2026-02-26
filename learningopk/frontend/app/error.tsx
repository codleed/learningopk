"use client";

import { RouteError } from "@/components/foundation/route-state";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error, reset }: RootErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <RouteError
        title="Something went wrong"
        description={error.message || "An unexpected application error occurred."}
        onRetry={reset}
      />
    </div>
  );
}

