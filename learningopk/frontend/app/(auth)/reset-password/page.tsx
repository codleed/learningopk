import { AuthLayout } from "@/components/auth/auth-layout";
import { ResetPasswordForm } from "@/components/auth/reset-password-form";

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
    <AuthLayout
      title="Reset your password"
      subtitle="Enter a new password to secure your account"
      showHero={false}
    >
      <ResetPasswordForm token={token.length > 0 ? token : null} initialError={initialError} />
    </AuthLayout>
  );
}
