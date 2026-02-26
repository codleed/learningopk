"use client";

import { RouteError } from "@/components/foundation/route-state";

type AuthErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function AuthError({ error, reset }: AuthErrorProps) {
  return (
    <div className="mx-auto w-full max-w-5xl px-6 py-12">
      <RouteError title="Auth page failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

