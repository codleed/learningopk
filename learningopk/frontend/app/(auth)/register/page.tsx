import { redirect } from "next/navigation";

import { AuthLayout } from "@/components/auth/auth-layout";
import { RegisterForm } from "@/components/auth/register-form";
import { getServerSession } from "@/lib/session";

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Join LearningoPK and start your learning journey today"
      topLink={{ href: "/login", label: "Sign in" }}
    >
      <RegisterForm />
    </AuthLayout>
  );
}
