import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";
import { AppShell } from "@/components/foundation/app-shell";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await getServerSession();
    if (!session) redirect("/login");

    return (
      <AppShell session={session} currentPath="/school">
        {children}
      </AppShell>
    );
  } catch {
    redirect("/dashboard");
  }
}
