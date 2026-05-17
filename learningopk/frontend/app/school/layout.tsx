import { redirect } from "next/navigation";
import { getServerSession } from "@/lib/session";

export default async function SchoolLayout({ children }: { children: React.ReactNode }) {
  const session = await getServerSession();
  if (!session) redirect("/login");

  return <>{children}</>;
}
