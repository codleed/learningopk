"use client";

import { ErrorState } from "@/components/ui/states";

type ForumThreadErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ForumThreadError({ error: _error, reset }: ForumThreadErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-10">
      <ErrorState
        title="Thread failed to load"
        description="We couldn't load this thread. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
