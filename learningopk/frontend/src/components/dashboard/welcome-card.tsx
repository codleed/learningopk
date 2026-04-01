import { Avatar } from "@/components/ui/avatar";

type WelcomeCardProps = {
  displayName: string;
  email: string;
};

export function WelcomeCard({ displayName, email }: WelcomeCardProps) {
  return (
    <article className="rounded-xl border border-border-default bg-bg-surface p-6">
      <div className="flex items-center gap-4">
        <Avatar name={displayName} size="lg" />
        <div className="min-w-0">
          <p className="text-xs font-medium text-text-secondary">
            Welcome back
          </p>
          <h2 className="font-[var(--font-display)] mt-0.5 text-xl font-bold text-text-primary truncate">
            {displayName}
          </h2>
          <p className="mt-1 text-xs text-text-muted truncate">
            Signed in as {email}
          </p>
        </div>
      </div>
    </article>
  );
}
