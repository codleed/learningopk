import { cookies } from "next/headers";

import { SchoolsListPanel } from "@/components/admin/schools-list-panel";
import { getSchools } from "@/lib/school-api";

export default async function AdminSchoolsPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();
  const payload = await getSchools(cookieHeader).catch(() => ({ schools: [] }));

  return (
    <div className="space-y-6">
      <SchoolsListPanel initialSchools={payload?.schools ?? []} />
    </div>
  );
}
