import Link from "next/link";
import { cookies } from "next/headers";

import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { AdminPageHeader } from "@/components/admin/page-header";
import { getAdminBackups } from "@/lib/admin-api";

export default async function AdminBackupPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getAdminBackups({ cookieHeader }).catch(() => ({
    backups: [],
  }));

  return (
    <div className="space-y-6">
      <AdminPageHeader
        eyebrow="Database Operations"
        title="Backup & Restore"
        subtitle="Create, restore, and manage database backup snapshots."
        actions={
          <Link
            href="/admin"
            className="text-sm font-medium text-text-primary underline underline-offset-4"
          >
            Back to admin
          </Link>
        }
      />
      <AdminBackupPanel initialBackups={payload.backups} />
    </div>
  );
}
