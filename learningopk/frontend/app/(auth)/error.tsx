"use client";

import { ErrorState } from "@/components/ui/states";

type AuthErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthError({ error: _error, reset }: AuthErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <ErrorState
        title="Authentication failed to load"
        description="We couldn't load the sign-in page. Please try again."
        onRetry={reset}
      />
    </div>
  );
}
