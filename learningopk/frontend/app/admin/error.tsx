"use client";

import { ErrorState } from "@/components/ui/states";

type AdminErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AdminError({ error: _error, reset }: AdminErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <ErrorState
        title="Admin page failed to load"
        description="We couldn't load the admin panel. Please try again."
        onRetry={reset}
      />
    </div>
  );
}

