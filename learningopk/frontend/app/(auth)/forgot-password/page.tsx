import { AuthLayout } from "@/components/auth/auth-layout";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";

export default function ForgotPasswordPage() {
  return (
    <AuthLayout
      title="Forgot Password?"
      subtitle="Enter your email to receive reset instructions"
      showHero={false}
    >
      <ForgotPasswordForm />
    </AuthLayout>
  );
}
