import Link from "next/link";
import { LockKeyhole } from "lucide-react";

import { Button } from "@/components/ui/button";

type AuthGuardMessageVariant = "auth" | "permission";

type AuthGuardMessageProps = {
  variant?: AuthGuardMessageVariant;
  title?: string;
  description?: string;
  backHref?: string;
};

export function AuthGuardMessage({
  variant = "auth",
  title,
  description,
  backHref = "/"
}: AuthGuardMessageProps) {
  const resolvedTitle = title ?? (variant === "auth" ? "Sign in required" : "You do not have permission");
  const resolvedDescription =
    description ??
    (variant === "auth"
      ? "This page requires an active account session."
      : "Your account cannot access this section. Contact an admin if you believe this is a mistake.");

  return (
    <section className="surface-soft rounded-2xl border border-border p-6 text-center">
      <div className="mx-auto mb-3 inline-flex h-11 w-11 items-center justify-center rounded-full bg-muted text-muted-foreground">
        <LockKeyhole className="h-5 w-5" aria-hidden />
      </div>
      <h2 className="text-lg font-semibold text-foreground">{resolvedTitle}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{resolvedDescription}</p>
      <div className="mt-4 flex justify-center gap-2">
        <Link href="/login">
          <Button size="sm">Log in</Button>
        </Link>
        <Link href={backHref}>
          <Button variant="secondary" size="sm">
            Go back
          </Button>
        </Link>
      </div>
    </section>
  );
}

