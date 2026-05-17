import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { getSchoolDashboard } from "@/lib/school-api";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  // Verify user is a school admin by trying to fetch dashboard
  const dashboard = await getSchoolDashboard();
  if (!dashboard) {
    redirect("/dashboard");
  }

  return <>{children}</>;
}
