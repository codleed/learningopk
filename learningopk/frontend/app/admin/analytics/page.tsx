import { AdminComingSoonAction } from "@/components/admin/admin-coming-soon-action";
import { AdminSectionPlaceholder } from "@/components/admin/admin-section-placeholder";

export default function AdminAnalyticsPage() {
  return (
    <AdminSectionPlaceholder
      title="Analytics & Reporting"
      description="Delivery and moderation KPI dashboards will launch with saved report templates."
      action={<AdminComingSoonAction label="Generate Report (Coming Soon)" />}
    />
  );
}
