import type { ReactNode } from "react";

import { AuthGuardMessage } from "@/components/auth/auth-guard-message";
import type { SessionPayload } from "@/lib/session";

export type AdminSession = SessionPayload & {
  user: SessionPayload["user"] & { role: "admin" };
};

export type StaffSession = SessionPayload & {
  user: SessionPayload["user"] & { role: "admin" | "moderator" };
};

export const isAdminSession = (session: SessionPayload | null): session is AdminSession =>
  Boolean(session && session.user.role === "admin");

export const isStaffSession = (session: SessionPayload | null): session is StaffSession =>
  Boolean(session && (session.user.role === "admin" || session.user.role === "moderator"));

type AdminGuardProps = {
  session: SessionPayload | null;
  children?: ReactNode;
};

export function AdminGuard({ session, children }: AdminGuardProps) {
  if (!session) {
    return <AuthGuardMessage variant="auth" title="Staff login required" />;
  }

  if (!isStaffSession(session)) {
    return (
      <AuthGuardMessage
        variant="permission"
        title="Staff access only"
        description="Your account does not have staff privileges."
        backHref="/dashboard"
      />
    );
  }

  return <>{children ?? null}</>;
}
