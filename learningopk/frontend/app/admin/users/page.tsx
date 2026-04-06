import { cookies } from "next/headers";

import { AdminUsersPanel } from "@/components/admin/admin-users-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
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
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Admin Users"
        title="User Management"
        subtitle="Search learners and admins with role-based filtering."
      />
      <AdminUsersPanel initialEntries={usersPayload.entries} initialTotal={usersPayload.total} />
    </div>
  );
}
