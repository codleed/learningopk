import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";
import { RegisterForm } from "@/components/auth/register-form";
import { AuthTopNavbar } from "@/components/auth/auth-top-navbar";
import { getServerSession } from "@/lib/session";

export default async function RegisterPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AppShell currentPath="/register" session={session}>
      <div className="space-y-6">
        <AuthTopNavbar currentPath="/register" />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageHeader
            eyebrow="Start Learning"
            title="Create your student account"
            subtitle="Set up your profile once and continue your chapter progress across dashboard, quizzes, and forum."
          />

          <SectionCard
            title="Register"
            description="All fields are required."
            className="h-fit"
            contentClassName="space-y-4"
          >
            <RegisterForm />
            <p className="text-sm text-muted-foreground">
              Already have an account?{" "}
              <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
                Sign in
              </Link>
            </p>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
