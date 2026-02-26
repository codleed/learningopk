import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminNotificationsPage() {
  return (
    <AdminSectionPlaceholder
      title="Notifications"
      description="Broadcast campaigns and audience segmentation are staged for upcoming phases."
      action={<AdminComingSoonAction label="Create Broadcast (Coming Soon)" />}
    />
  );
}
