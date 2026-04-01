import { redirect } from "next/navigation";

import { RegisterPageClient } from "@/components/auth/register-page-client";
import { getServerSession } from "@/lib/session";

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return <RegisterPageClient />;
}
