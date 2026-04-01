import { redirect } from "next/navigation";

import { LoginPageClient } from "@/components/auth/login-page-client";
import { getServerSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return <LoginPageClient />;
}
