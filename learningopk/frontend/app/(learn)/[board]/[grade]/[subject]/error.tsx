"use client";

import { ErrorState } from "@/components/ui/states";

type SubjectErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function SubjectError({ error: _error, reset }: SubjectErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ErrorState
        title="Subject page failed to load"
        description="We couldn't load this subject. Please try again or go back to the dashboard."
        onRetry={reset}
      />
    </div>
  );
}

