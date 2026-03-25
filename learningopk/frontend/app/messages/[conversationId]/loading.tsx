import { LoadingSkeleton } from "@/components/ui/states";

export default function Loading() {
  return (
    <div className="flex flex-col h-[calc(100vh-8rem)]">
      <div className="flex items-center gap-3 pb-4 border-b border-border">
        <div className="h-10 w-10 animate-pulse rounded-full bg-muted" />
        <div className="space-y-2">
          <div className="h-5 w-32 animate-pulse rounded bg-muted" />
          <div className="h-3 w-20 animate-pulse rounded bg-muted" />
        </div>
      </div>
      <div className="flex-1 py-4 space-y-4">
        <LoadingSkeleton rows={8} />
      </div>
      <div className="pt-4 border-t border-border">
        <div className="h-12 w-full animate-pulse rounded-lg bg-muted" />
      </div>
    </div>
  );
}
