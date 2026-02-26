"use client";

import { RouteError } from "@/components/foundation/route-state";

type ChapterErrorProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ChapterError({ error, reset }: ChapterErrorProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <RouteError title="Chapter page failed to load" description={error.message} onRetry={reset} />
    </div>
  );
}

