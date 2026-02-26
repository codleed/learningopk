import Link from "next/link";

import { ResetPasswordForm } from "@/components/auth/reset-password-form";
import { AppShell } from "@/components/foundation/app-shell";
import { PageHeader } from "@/components/foundation/page-header";
import { SectionCard } from "@/components/foundation/section-card";

type ResetPasswordPageProps = {
  searchParams: Promise<{
    token?: string | string[];
    error?: string | string[];
  }>;
};

const getFirstQueryValue = (value: string | string[] | undefined): string | undefined => {
  if (Array.isArray(value)) {
    return value[0];
  }

  return value;
};

export default async function ResetPasswordPage({ searchParams }: ResetPasswordPageProps) {
  const query = await searchParams;
  const token = (getFirstQueryValue(query.token) ?? "").trim();
  const error = (getFirstQueryValue(query.error) ?? "").trim();

  const initialError: "missing_token" | "invalid_token" | null =
    error === "INVALID_TOKEN" ? "invalid_token" : token.length === 0 ? "missing_token" : null;

  return (
    <AppShell currentPath="/reset-password" session={null}>
      <div className="grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <PageHeader
          eyebrow="Account Recovery"
          title="Set a new password"
          subtitle="Submit your reset token with a new password to complete account recovery."
        />
        <SectionCard title="Reset password" description="Choose a strong password you have not used before.">
          <ResetPasswordForm token={token.length > 0 ? token : null} initialError={initialError} />
          <p className="mt-3 text-sm text-muted-foreground">
            Back to{" "}
            <Link href="/login" className="font-semibold text-foreground underline underline-offset-4">
              sign in
            </Link>
          </p>
        </SectionCard>
      </div>
    </AppShell>
  );
}
