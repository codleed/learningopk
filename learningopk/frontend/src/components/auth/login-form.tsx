"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { LockKeyhole, Mail } from "lucide-react";
import { z } from "zod";

import { FormField } from "@/components/auth/form-field";
import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { authClient } from "@/lib/auth-client";

const loginSchema = z.object({
  email: z.string().trim().email("Please enter a valid email."),
  password: z.string().min(8, "Password must be at least 8 characters.")
});

export const LoginForm = () => {
  const router = useRouter();
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setSubmitted(true);
    setErrorMessage(null);

    const formData = new FormData(event.currentTarget);
    const parsed = loginSchema.safeParse({
      email: String(formData.get("email") ?? ""),
      password: String(formData.get("password") ?? "")
    });

    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Please enter a valid email and password.");
      return;
    }

    setIsPending(true);
    let result: Awaited<ReturnType<typeof authClient.signIn.email>>;
    try {
      result = await authClient.signIn.email(parsed.data);
    } catch {
      setIsPending(false);
      setErrorMessage("Unable to reach authentication server. Ensure backend is running on port 3001.");
      return;
    }
    setIsPending(false);

    if (result.error) {
      setErrorMessage(result.error.message ?? "Login failed.");
      return;
    }

    router.push("/dashboard");
    router.refresh();
  };

  const emailError = submitted && errorMessage?.toLowerCase().includes("email") ? errorMessage : null;
  const passwordError = submitted && errorMessage?.toLowerCase().includes("password") ? errorMessage : null;

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <FormField htmlFor="email" label="Email Address" error={emailError}>
        <div className="relative">
          <Mail aria-hidden className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-muted-foreground" />
          <Input
            id="email"
            name="email"
            data-testid="login-email-input"
            type="email"
            required
            autoComplete="email"
            aria-invalid={emailError ? true : undefined}
            aria-label="Email"
            placeholder="name@example.com"
            className="pl-10"
          />
        </div>
      </FormField>
      <PasswordInput
        name="password"
        data-testid="login-password-input"
        label="Password"
        icon={LockKeyhole}
        iconPosition="left"
        required
        minLength={8}
        autoComplete="current-password"
        aria-invalid={passwordError ? true : undefined}
        placeholder="••••••••"
        error={passwordError}
      />
      {errorMessage && !emailError && !passwordError ? (
        <p className="rounded-lg border border-destructive/20 bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {errorMessage}
        </p>
      ) : null}
      <Button
        data-testid="login-submit-button"
        type="submit"
        disabled={isPending}
        width="full"
        size="lg"
      >
        {isPending ? "Signing In..." : "Sign In"}
      </Button>
      <p className="text-center text-sm text-muted-foreground">
        Don&apos;t have an account?{" "}
        <Link href="/register" className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
          Create account
        </Link>
      </p>
    </form>
  );
};
