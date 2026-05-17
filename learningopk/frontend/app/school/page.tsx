import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { getSchoolDashboard } from "@/lib/school-api";
import { SchoolDashboardClient } from "@/components/school/school-dashboard-client";

export default async function SchoolPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  let dashboard = null;
  try {
    dashboard = await getSchoolDashboard(cookieHeader);
  } catch {
    // Not a school admin or backend error — redirect to dashboard
    redirect("/dashboard");
  }

  if (!dashboard) redirect("/dashboard");

  return <SchoolDashboardClient initialData={dashboard} />;
}
