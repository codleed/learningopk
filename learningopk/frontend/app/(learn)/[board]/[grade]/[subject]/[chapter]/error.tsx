"use client";

import { ErrorState } from "@/components/ui/states";

type ChapterErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ChapterError({ error: _error, reset }: ChapterErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ErrorState
        title="Chapter page failed to load"
        description="We couldn't load this chapter. Please try again or return to the subject page."
        onRetry={reset}
      />
    </div>
  );
}
