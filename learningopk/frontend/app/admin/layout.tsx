import type { ReactNode } from "react";

import { AdminGuard, isStaffSession } from "@/components/admin/admin-guard";
import { AppShell } from "@/components/foundation/app-shell";
import { getServerSession } from "@/lib/session";

type AdminLayoutProps = {
  children: ReactNode;
};

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const session = await getServerSession();

  if (!isStaffSession(session)) {
    return <AdminGuard session={session} />;
  }

  return (
    <AdminGuard session={session}>
      <AppShell session={session} currentPath="/admin">
        {children}
      </AppShell>
    </AdminGuard>
  );
}
