"use client";

import { ErrorState } from "@/components/ui/states";

type AITutorErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AITutorError({ error: _error, reset }: AITutorErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ErrorState
        title="AI Tutor failed to load"
        description="We couldn't start the AI Tutor. Please try again in a moment."
        onRetry={reset}
      />
    </div>
  );
}
