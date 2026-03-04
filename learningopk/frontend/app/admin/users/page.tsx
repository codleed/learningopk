import Link from "next/link";
import { cookies } from "next/headers";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { getAdminUsers } from "@/lib/admin-api";

export default async function AdminUsersPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const usersPayload = await getAdminUsers({
    page: 1,
    pageSize: 10,
    q: "",
    role: "",
    cookieHeader
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 10,
    hasMore: false
  }));

  return (
    <div className="space-y-6 px-1">
      <header className="border-b border-border/75 pb-5">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="space-y-2">
            <p className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">Admin Users</p>
            <h1 className="text-3xl font-semibold leading-tight tracking-[-0.02em] text-foreground sm:text-4xl">
              User Management
            </h1>
            <p className="max-w-3xl text-sm text-muted-foreground sm:text-base">
              Search learners and admins with role-based filtering.
            </p>
          </div>
          <Link href="/admin" className="pt-1 text-sm font-semibold text-primary underline underline-offset-4">
            Back to admin
          </Link>
        </div>
      </header>
      <AdminUsersPanel initialEntries={usersPayload.entries} initialTotal={usersPayload.total} />
    </div>
  );
}
