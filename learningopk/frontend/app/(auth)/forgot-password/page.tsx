import Link from "next/link";

import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";

export default function ForgotPasswordPage() {
  return (
    <AppShell currentPath="/forgot-password" session={null}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <PageHeader
          eyebrow="Account Recovery"
          title="Reset your password"
          subtitle="Enter the email used with LearningoPK and we will send reset instructions if an account exists."
        />
        <SectionCard title="Forgot password" description="We recommend using your school email if registered with it.">
          <ForgotPasswordForm />
          <p className="mt-3 text-sm text-muted-foreground">
            Remembered it?{" "}
            <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
              Return to sign in
            </Link>
          </p>
        </SectionCard>
      </div>
    </AppShell>
  );
}
