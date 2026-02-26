import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminModerationPage() {
  return (
    <AdminSectionPlaceholder
      title="Flagging & Moderation"
      description="Phase 2 will introduce a unified abuse queue and reviewer assignment flow."
      action={<AdminComingSoonAction label="Open Review Queue (Coming Soon)" />}
    />
  );
}
