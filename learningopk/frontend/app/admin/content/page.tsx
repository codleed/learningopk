import { cookies } from "next/headers";

import { ContentDashboard } from "./content-dashboard";
import { getAdminContentAuditLogs, getAdminCurriculumTree } from "@/lib/admin-api";

export default async function AdminContentPage() {
  const cookieStore = await cookies();
  const cookieHeader = cookieStore.toString();

  const curriculumBoards = await getAdminCurriculumTree(cookieHeader).catch(() => []);
  const contentAuditLogs = await getAdminContentAuditLogs({
    page: 1,
    pageSize: 5,
    cookieHeader
  }).catch(() => ({
    entries: [],
    total: 0,
    page: 1,
    pageSize: 5,
    hasMore: false
  }));

  return (
    <ContentDashboard
      boards={curriculumBoards}
      auditLogs={contentAuditLogs.entries}
    />
  );
}
