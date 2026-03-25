import { LoadingSkeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <div className="h-10 w-10 animate-pulse rounded-lg bg-muted" />
        <div className="space-y-2">
          <div className="h-8 w-48 animate-pulse rounded bg-muted" />
          <div className="h-4 w-64 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="rounded-xl border border-border bg-card p-6">
        <LoadingSkeleton rows={8} variant="card" />
      </div>
    </div>
  );
}
