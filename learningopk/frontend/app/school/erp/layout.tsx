import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { ErpNav } from "@/components/erp/erp-nav";
import { ErpProvider } from "@/components/erp/erp-provider";
import { getServerSession } from "@/lib/session";
import { fetchErpSchoolsServer } from "@/lib/erp-api";

export default async function ErpLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  const cookieStore = await cookies();
  const schools = await fetchErpSchoolsServer(cookieStore.toString());

  if (schools.length === 0) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center p-8">
        <div className="max-w-md text-center">
          <h1 className="text-xl font-bold">No school access</h1>
          <p className="mt-2 text-sm text-text-secondary">
            You do not have access to any school management workspace. Ask your school administrator
            to invite you, or contact the platform team.
          </p>
        </div>
      </div>
    );
  }

  return (
    <ErpProvider schools={schools} initialSchoolId={schools[0]?.id ?? null}>
      <div className="flex min-h-[calc(100vh-64px)] flex-col lg:flex-row">
        <ErpNav />
        <main className="min-w-0 flex-1 p-6">{children}</main>
      </div>
    </ErpProvider>
  );
}
