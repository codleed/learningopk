import Link from "next/link";
import { redirect } from "next/navigation";

import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";
import { LoginForm } from "@/components/auth/login-form";
import { AuthTopNavbar } from "@/components/auth/auth-top-navbar";
import { getServerSession } from "@/lib/session";

export default async function LoginPage() {
  const session = await getServerSession();
  if (session) {
    redirect("/dashboard");
  }

  return (
    <AppShell currentPath="/login" session={session}>
      <div className="space-y-6">
        <AuthTopNavbar currentPath="/login" />

        <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <PageHeader
            eyebrow="Student Access"
            title="Welcome back"
            subtitle="Sign in to continue chapter learning, quiz practice, and AI-guided tutoring."
          />

          <SectionCard
            title="Log in"
            description="Use your registered email and password."
            className="h-fit"
            contentClassName="space-y-4"
          >
            <LoginForm />
            <div className="flex flex-wrap items-center justify-between gap-2 text-sm text-muted-foreground">
              <Link href="/forgot-password" className="font-medium text-foreground underline underline-offset-4">
                Forgot password?
              </Link>
              <p>
                New here?{" "}
                <Link href="/register" className="font-semibold text-foreground underline underline-offset-4">
                  Create account
                </Link>
              </p>
            </div>
          </SectionCard>
        </div>
      </div>
    </AppShell>
  );
}
