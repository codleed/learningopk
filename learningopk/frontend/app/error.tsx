"use client";

import { ErrorState } from "@/components/ui/states";

type RootErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function RootError({ error: _error, reset }: RootErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <ErrorState
        title="Something went wrong"
        description="An unexpected error occurred. Please try again or refresh the page."
        onRetry={reset}
      />
    </div>
  );
}
