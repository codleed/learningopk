import { redirect } from "next/navigation";

import { VerifyEmailClient } from "@/components/auth/verify-email-client";
import { getServerSession } from "@/lib/session";

export default async function VerifyEmailPage() {
  const session = await getServerSession();
  if (!session) {
    redirect("/login");
  }

  return <VerifyEmailClient />;
}
