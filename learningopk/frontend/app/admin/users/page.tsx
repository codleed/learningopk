import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminUsersPage() {
  return (
    <AdminSectionPlaceholder
      title="User Management"
      description="Phase 3 will add search, filters, and bulk account actions."
      action={<AdminComingSoonAction label="Export Users (Coming Soon)" />}
    />
  );
}
