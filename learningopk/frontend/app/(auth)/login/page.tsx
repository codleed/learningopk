import { redirect } from "next/navigation";
import { LockKeyhole } from "lucide-react";

import { BentoAuthShell } from "@/components/auth/bento-auth-shell";
import { LoginForm } from "@/components/auth/login-form";
import { getServerSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <BentoAuthShell
      title="Welcome Back"
      subtitle="Log in to continue your learning journey"
      topLink={{ href: "/register", label: "Create account" }}
      badge={
        <div className="flex h-14 w-14 items-center justify-center rounded-full bg-[#eef7e3] text-[#7ac943]">
          <LockKeyhole aria-hidden className="h-6 w-6" strokeWidth={2.2} />
        </div>
      }
      cardClassName="max-w-[37.5rem]"
    >
      <LoginForm />
    </BentoAuthShell>
  );
}
