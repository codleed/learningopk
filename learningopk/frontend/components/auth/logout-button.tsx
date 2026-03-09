"use client";

import { useRouter } from "next/navigation";
import type { ReactNode } from "react";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  label?: string;
  pendingLabel?: string;
  ariaLabel?: string;
  icon?: ReactNode;
  hideLabel?: boolean;
  className?: string;
};

export const LogoutButton = ({
  label = "Sign out",
  pendingLabel = "Signing out...",
  ariaLabel,
  icon,
  hideLabel = false,
  className
}: LogoutButtonProps = {}) => {
  const router = useRouter();
  const [isPending, setIsPending] = useState(false);

  const onSignOut = async () => {
    setIsPending(true);
    await authClient.signOut();
    setIsPending(false);
    router.push("/login");
    router.refresh();
  };

  return (
    <Button
      type="button"
      onClick={onSignOut}
      disabled={isPending}
      size="sm"
      variant="secondary"
      aria-label={ariaLabel}
      className={cn(className)}
    >
      {icon ? <span className="inline-flex items-center justify-center text-current">{icon}</span> : null}
      {hideLabel ? <span className="sr-only">{isPending ? pendingLabel : label}</span> : isPending ? pendingLabel : label}
    </Button>
  );
};
