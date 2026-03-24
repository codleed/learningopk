type WelcomeCardProps = {
  displayName: string;
  email: string;
};

export function WelcomeCard({ displayName, email }: WelcomeCardProps) {
  return (
    <article className="surface-card rounded-2xl border border-border p-6">
      <p className="text-sm text-muted-foreground">Welcome back</p>
      <h2 className="mt-1 text-2xl font-semibold text-foreground">{displayName}</h2>
      <p className="mt-3 text-sm text-muted-foreground">Signed in as {email}</p>
    </article>
  );
}

