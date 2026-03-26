import Link from "next/link";

import { AdminBackupPanel } from "@/components/admin/admin-backup-panel";
import { PageHeader } from "@/components/foundation/page-header";

export default function AdminBackupPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Admin Backup"
        title="Backup & Restore"
        subtitle="Create database backups and restore from previous versions."
        actions={
          <Link href="/admin" className="text-sm font-medium text-foreground underline underline-offset-4">
            Back to admin
          </Link>
        }
      />
      <AdminBackupPanel />
    </div>
  );
}
