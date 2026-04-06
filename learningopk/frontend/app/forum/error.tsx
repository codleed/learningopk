"use client";

import { ErrorState } from "@/components/ui/states";

type ForumErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ForumError({ error: _error, reset }: ForumErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ErrorState
        title="Forum feed failed to load"
        description="We couldn't load the forum. Please try again."
        onRetry={reset}
      />
    </div>
  );
}

