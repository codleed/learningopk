"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

import { Button } from "@/components/ui/button";
import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

type LogoutButtonProps = {
  label?: string;
  pendingLabel?: string;
  ariaLabel?: string;
  className?: string;
};

export const LogoutButton = ({
  label = "Sign out",
  pendingLabel = "Signing out...",
  ariaLabel,
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
      {isPending ? pendingLabel : label}
    </Button>
  );
};
