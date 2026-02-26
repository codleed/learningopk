"use client";

import { useRouter } from "next/navigation";
import { FormEvent, useState } from "react";
import { z } from "zod";

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
    <form onSubmit={onSubmit} className="space-y-4" noValidate>
      <div className="space-y-1">
        <label htmlFor="email" className="block text-sm font-medium text-foreground">
          Email
        </label>
        <Input
          id="email"
          name="email"
          type="email"
          required
          autoComplete="email"
          aria-invalid={emailError ? true : undefined}
        />
        {emailError ? <p className="text-xs text-rose-700">{emailError}</p> : null}
      </div>
      <div className="space-y-1">
        <label htmlFor="password" className="block text-sm font-medium text-foreground">
          Password
        </label>
        <Input
          id="password"
          name="password"
          type="password"
          required
          minLength={8}
          autoComplete="current-password"
          aria-invalid={passwordError ? true : undefined}
        />
        {passwordError ? <p className="text-xs text-rose-700">{passwordError}</p> : null}
      </div>
      {errorMessage && !emailError && !passwordError ? (
        <p className="rounded-lg border border-rose-300 bg-rose-50 px-3 py-2 text-sm text-rose-800">{errorMessage}</p>
      ) : null}
      <Button type="submit" disabled={isPending} width="full">
        {isPending ? "Signing in..." : "Sign in"}
      </Button>
    </form>
  );
};
