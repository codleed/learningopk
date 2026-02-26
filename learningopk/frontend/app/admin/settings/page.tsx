import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminSettingsPage() {
  return (
    <AdminSectionPlaceholder
      title="System Settings"
      description="Global defaults, feature gates, and audit retention controls are planned next."
      action={<AdminComingSoonAction label="Save Defaults (Coming Soon)" />}
    />
  );
}
