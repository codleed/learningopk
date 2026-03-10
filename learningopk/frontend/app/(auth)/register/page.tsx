import { redirect } from "next/navigation";

import { BentoAuthShell } from "@/components/auth/bento-auth-shell";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerSession } from "@/lib/session";

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <BentoAuthShell
      title="Create your student account"
      subtitle="Join our learning community and start your journey today."
      topLink={{ href: "/login", label: "Log in" }}
      cardClassName="max-w-[50rem] px-6 py-8 sm:px-14 sm:py-12"
    >
      <RegisterForm />
    </BentoAuthShell>
  );
}
