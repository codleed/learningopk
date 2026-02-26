import type { ReactNode } from "react";

import { AdminGuard, isAdminSession } from "@/components/admin/admin-guard";
import { AdminShell } from "@/components/admin/admin-shell";
import { getServerSession } from "@/lib/session";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession();

  if (!isAdminSession(session)) {
    return <AdminGuard session={session} />;
  }

  return (
    <AdminGuard session={session}>
      <AdminShell session={session}>{children}</AdminShell>
    </AdminGuard>
  );
}
