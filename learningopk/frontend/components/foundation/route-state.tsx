import { LoadingSkeleton, ErrorState } from "@/components/ui/states";

type RouteLoadingProps = {
  title: string;
  description?: string;
};

export function RouteLoading({ title, description }: RouteLoadingProps) {
  return (
    <div className="mx-auto w-full max-w-6xl px-4 py-8 sm:px-6 lg:px-10">
      <LoadingSkeleton title={title} rows={4} />
      {description ? <p className="mt-3 text-sm text-muted-foreground">{description}</p> : null}
    </div>
  );
}

type RouteErrorProps = {
  title: string;
  description: string;
  onRetry: () => void;
};

export function RouteError({ title, description, onRetry }: RouteErrorProps) {
  return <ErrorState title={title} description={description} onRetry={onRetry} />;
}

