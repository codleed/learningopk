import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  try {
    const session = await getServerSession();
    if (!session) redirect("/login");

    return <>{children}</>;
  } catch {
    redirect("/dashboard");
  }
}
