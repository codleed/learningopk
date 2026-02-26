import type { ReactNode } from "react";

import { AuthGuardMessage } from "@/components/auth/auth-guard-message";
import type { SessionPayload } from "@/lib/session";

type AdminGuardProps = {
  session: SessionPayload | null;
  children: ReactNode;
};

export function AdminGuard({ session, children }: AdminGuardProps) {
  if (!session) {
    return <AuthGuardMessage variant="auth" title="Admin login required" />;
  }

  if (session.user.role !== "admin") {
    return (
      <AuthGuardMessage
        variant="permission"
        title="Admin access only"
        description="Your account is authenticated but does not have admin privileges."
        backHref="/dashboard"
      />
    );
  }

  return <>{children}</>;
}

