import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { AppShell } from "@/components/foundation/app-shell";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  let session;
  try {
    session = await getServerSession();
  } catch {
    redirect("/dashboard");
  }

  if (!session) redirect("/login");

  return (
    <AppShell session={session} currentPath="/school">
      {children}
    </AppShell>
  );
}
