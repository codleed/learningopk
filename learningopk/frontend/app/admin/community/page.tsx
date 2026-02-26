import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminCommunityPage() {
  return (
    <AdminSectionPlaceholder
      title="Community Forum"
      description="Forum policy controls and escalation tooling are planned for the next sprint."
      action={<AdminComingSoonAction label="Open Policy Matrix (Coming Soon)" />}
    />
  );
}
