import { redirect } from "next/navigation";
import { getSchoolDashboard } from "@/lib/school-api";
import { SchoolDashboardClient } from "@/components/school/school-dashboard-client";

export default async function SchoolPage() {
  const dashboard = await getSchoolDashboard();
  if (!dashboard) redirect("/dashboard");

  return <SchoolDashboardClient initialData={dashboard} />;
}
