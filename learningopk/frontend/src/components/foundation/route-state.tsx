import { LoadingSkeleton } from "@/components/ui/states";

type RouteLoadingProps = {
  title: string;
  description?: string;
};

export function RouteLoading({ title, description }: RouteLoadingProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <LoadingSkeleton title={title} rows={4} />
      {description ? <p className="mt-3 text-sm text-text-secondary">{description}</p> : null}
    </div>
  );
}

