"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { LockKeyhole, ArrowLeft, CheckCircle } from "lucide-react";
import { z } from "zod";

import { PasswordInput } from "@/components/auth/password-input";
import { Button } from "@/components/ui/button";

type ResetPasswordFormProps = {
  token: string | null;
  initialError: "missing_token" | "invalid_token" | null;
};

const resetPasswordSchema = z
  .object({
    newPassword: z.string().trim().min(1, "Please enter a new password."),
    confirmPassword: z.string().trim().min(1, "Please confirm your new password.")
  })
  .superRefine((value, context) => {
    if (value.newPassword !== value.confirmPassword) {
      context.addIssue({
        code: "custom",
        path: ["confirmPassword"],
        message: "Passwords do not match."
      });
    }
  });

const backendUrl = process.env.NEXT_PUBLIC_BACKEND_URL ?? "http://localhost:3001";

const mapResetPasswordErrorMessage = async (response: Response): Promise<string> => {
  let responseMessage: string | null = null;

  try {
    const payload = (await response.json()) as { message?: string; error?: string };
    responseMessage = payload.message ?? payload.error ?? null;
  } catch {
    responseMessage = null;
  }

  if (responseMessage?.includes("INVALID_TOKEN")) {
    return "Reset link is invalid or expired. Request a new password reset link.";
  }

  if (responseMessage?.includes("PASSWORD_TOO_SHORT")) {
    return "Password must be at least 8 characters.";
  }

  if (responseMessage?.includes("PASSWORD_TOO_LONG")) {
    return "Password is too long. Use a shorter password and try again.";
  }

  if (response.status >= 500) {
    return "Password reset service is temporarily unavailable. Try again shortly.";
  }

  return "Unable to reset password right now.";
};

const submitPasswordReset = async (token: string, newPassword: string): Promise<void> => {
  const response = await fetch(`${backendUrl}/api/auth/reset-password`, {
    method: "POST",
    credentials: "include",
    headers: {
      "content-type": "application/json"
    },
    body: JSON.stringify({
      token,
      newPassword
    })
  });

  if (!response.ok) {
    throw new Error(await mapResetPasswordErrorMessage(response));
  }
};

const initialErrorMessageByType: Record<Exclude<ResetPasswordFormProps["initialError"], null>, string> = {
  missing_token: "Reset token is missing. Request a new reset link from forgot password.",
  invalid_token: "Reset link is invalid or expired. Request a new password reset link."
};

export function ResetPasswordForm({ token, initialError }: ResetPasswordFormProps) {
  const [errorMessage, setErrorMessage] = useState<string | null>(
    initialError ? initialErrorMessageByType[initialError] : null
  );
  const [isPending, setIsPending] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMessage(null);

    if (!token) {
      setErrorMessage(initialErrorMessageByType.missing_token);
      return;
    }

    const formData = new FormData(event.currentTarget);
    const parsed = resetPasswordSchema.safeParse({
      newPassword: String(formData.get("newPassword") ?? ""),
      confirmPassword: String(formData.get("confirmPassword") ?? "")
    });
    if (!parsed.success) {
      setErrorMessage(parsed.error.issues[0]?.message ?? "Enter a valid new password.");
      return;
    }

    setIsPending(true);
    try {
      await submitPasswordReset(token, parsed.data.newPassword);
      setIsSuccess(true);
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : "Unable to reset password right now.");
    } finally {
      setIsPending(false);
    }
  };

  if (isSuccess) {
    return (
      <div className="rounded-xl border border-success/20 bg-success/10 p-6 text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-success/20">
          <CheckCircle className="h-6 w-6 text-success" />
        </div>
        <h2 className="text-lg font-semibold text-foreground">Password reset complete</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Your password has been updated. Continue to login with your new credentials.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-flex h-11 items-center justify-center rounded-lg border border-border bg-card px-6 text-sm font-semibold text-foreground transition-colors hover:border-[var(--primary)]/50 hover:bg-accent"
        >
          Return to sign in
        </Link>
      </div>
    );
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      <PasswordInput
        name="newPassword"
        label="New Password"
        icon={LockKeyhole}
        iconPosition="left"
        required
        minLength={8}
        autoComplete="new-password"
        disabled={isPending || !token}
        aria-invalid={errorMessage ? true : undefined}
        placeholder="••••••••"
      />
      <PasswordInput
        name="confirmPassword"
        label="Confirm Password"
        icon={LockKeyhole}
        iconPosition="left"
        required
        minLength={8}
        autoComplete="new-password"
        disabled={isPending || !token}
        aria-invalid={errorMessage ? true : undefined}
        placeholder="••••••••"
      />
      {errorMessage ? <p className="text-sm font-medium text-destructive">{errorMessage}</p> : null}
      <Button 
        type="submit" 
        width="full" 
        size="lg"
        disabled={isPending || !token}
      >
        {isPending ? "Resetting..." : "Reset password"}
      </Button>
      {!token ? (
        <p className="text-center text-sm text-muted-foreground">
          Need a new link?{" "}
          <Link href="/forgot-password" className="font-semibold text-[var(--primary)] transition hover:text-[var(--primary-hover)]">
            Request password reset
          </Link>
        </p>
      ) : null}
      {token && (
        <div className="flex items-center justify-center">
          <Link
            href="/login"
            className="flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-[var(--primary)]"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to sign in
          </Link>
        </div>
      )}
    </form>
  );
}
